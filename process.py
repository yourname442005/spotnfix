from PIL import Image
from PIL.ExifTags import TAGS, GPSTAGS
from datetime import datetime, timedelta
import pymongo
from bson import ObjectId
from bson.errors import InvalidId
import os
import json
import sys

MONGO_URI = os.environ.get("MONGODB_URI", "mongodb://127.0.0.1:27017/sih_database")
DB_NAME = MONGO_URI.rsplit("/", 1)[-1].split("?")[0] or "sih_database"

def _as_object_id(value):
    """Store citizen references as ObjectIds, falling back to the raw string."""
    try:
        return ObjectId(value)
    except (InvalidId, TypeError):
        return value

def _to_degrees(value):
    """Convert GPS coordinates stored as rationals to float degrees."""
    def rational_to_float(r):
        num, den = r
        return float(num) / float(den) if den != 0 else 0.0

    d = rational_to_float(value[0])
    m = rational_to_float(value[1])
    s = rational_to_float(value[2])
    return d + (m / 60.0) + (s / 3600.0)

def get_photo_info(image_path, timezone_offset_hours=5.5):
    image = Image.open(image_path)
    exif_data = image._getexif()

    photo_date = None
    gps_info = {}

    if exif_data:
        for tag_id, value in exif_data.items():
            tag = TAGS.get(tag_id, tag_id)

            # Get Date/Time
            if tag == "DateTimeOriginal":
                dt = datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
                dt += timedelta(hours=timezone_offset_hours)  # adjust timezone
                photo_date = dt

            # Get GPS Info
            if tag == "GPSInfo":
                for key in value:
                    subtag = GPSTAGS.get(key, key)
                    gps_info[subtag] = value[key]

    # Convert GPS Info to decimal degrees
    gps_coords = None
    if gps_info:
        try:
            lat = gps_info.get("GPSLatitude")
            lat_ref = gps_info.get("GPSLatitudeRef")
            lon = gps_info.get("GPSLongitude")
            lon_ref = gps_info.get("GPSLongitudeRef")

            if lat and lat_ref and lon and lon_ref:
                lat_deg = _to_degrees(lat)
                lon_deg = _to_degrees(lon)

                if lat_ref in ("S", "s"):
                    lat_deg = -lat_deg
                if lon_ref in ("W", "w"):
                    lon_deg = -lon_deg

                gps_coords = (lat_deg, lon_deg)
        except Exception as e:
            print("Error processing GPS data:", e)

    return photo_date, gps_coords, exif_data

def validate_image_timestamp(image_path, max_hours=48):
    """
    Validate if image was taken within the specified hours (default 48 hours)
    Returns: (is_valid, photo_date, error_message)
    """
    try:
        photo_date, gps_coords, exif_data = get_photo_info(image_path)
        
        if photo_date is None:
            return False, None, "No DateTimeOriginal found in image metadata"
        
        current_time = datetime.now()
        time_difference = current_time - photo_date
        
        if time_difference.total_seconds() > (max_hours * 3600):
            hours_old = time_difference.total_seconds() / 3600
            return False, photo_date, f"Image is {hours_old:.1f} hours old. Maximum allowed is {max_hours} hours."
        
        return True, photo_date, None
        
    except Exception as e:
        return False, None, f"Error processing image: {str(e)}"

def save_to_mongodb(image_data, user_id, issue_data):
    """
    Save image and issue data to MongoDB
    """
    try:
        # MongoDB connection
        client = pymongo.MongoClient(MONGO_URI)
        db = client[DB_NAME]
        collection = db["user_reports"]
        
        # Prepare document
        document = {
            "user_id": _as_object_id(user_id),
            "issue_title": issue_data.get("title", ""),
            "issue_category": issue_data.get("category", ""),
            "issue_location": issue_data.get("location", ""),
            "issue_description": issue_data.get("description", ""),
            "reporting_method": issue_data.get("method", ""),
            "image_data": image_data,
            "image_timestamp": issue_data.get("image_timestamp"),
            "gps_coordinates": issue_data.get("gps_coordinates"),
            "status": "PENDING",
            "priority": "Medium",
            "created_at": datetime.now(),
            "updated_at": datetime.now()
        }
        
        # Insert document
        result = collection.insert_one(document)
        
        return {
            "success": True,
            "report_id": str(result.inserted_id),
            "message": "Report submitted successfully"
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Database error: {str(e)}"
        }

def process_image_upload(image_path, user_id, issue_data):
    """
    Main function to process image upload with validation and MongoDB storage
    """
    try:
        # Validate image timestamp
        is_valid, photo_date, error_msg = validate_image_timestamp(image_path)
        
        if not is_valid:
            return {
                "success": False,
                "error": error_msg
            }
        
        # Read image data
        with open(image_path, 'rb') as image_file:
            image_data = image_file.read()
        
        # Get GPS coordinates
        _, gps_coords, _ = get_photo_info(image_path)
        
        # Update issue data with image metadata
        issue_data["image_timestamp"] = photo_date.isoformat() if photo_date else None
        issue_data["gps_coordinates"] = gps_coords
        
        # Save to MongoDB
        result = save_to_mongodb(image_data, user_id, issue_data)
        
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": f"Processing error: {str(e)}"
        }

# Command line interface for testing
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process.py <image_path> [user_id] [issue_title] [issue_category] [issue_location] [issue_description]")
        sys.exit(1)
    
    image_path = sys.argv[1]
    user_id = sys.argv[2] if len(sys.argv) > 2 else "test_user"
    issue_title = sys.argv[3] if len(sys.argv) > 3 else "Test Issue"
    issue_category = sys.argv[4] if len(sys.argv) > 4 else "Other"
    issue_location = sys.argv[5] if len(sys.argv) > 5 else "Test Location"
    issue_description = sys.argv[6] if len(sys.argv) > 6 else "Test Description"
    
    issue_data = {
        "title": issue_title,
        "category": issue_category,
        "location": issue_location,
        "description": issue_description,
        "method": "photo"
    }
    
    result = process_image_upload(image_path, user_id, issue_data)
    print(json.dumps(result, indent=2))