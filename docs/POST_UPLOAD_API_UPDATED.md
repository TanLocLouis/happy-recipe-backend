# Post Upload API Documentation

## Endpoint
`POST /api/posts`

## Authentication
Requires Bearer token in Authorization header:
```
Authorization: Bearer <accessToken>
```

## Content-Type
`multipart/form-data`

## Request Body Structure

### Basic Fields
- `title` (required): string - Post title
- `description` (optional): string - Post description
- `cookTime` (optional): number - Cooking time in minutes
- `image` (required): File - The image file to upload

### Example Request Body
```json
{
  "title": "Delicious Pasta",
  "description": "A simple pasta recipe.",
  "cookTime": 30,
  "image": "<file>"
}
```

## Example Usage
### Sending a Post Request
```typescript
const formData = new FormData();
formData.append('title', 'Delicious Pasta');
formData.append('description', 'A simple pasta recipe.');
formData.append('cookTime', '30');
formData.append('image', fileInput.files[0]);

const response = await fetch(`${API_URL}/api/posts`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
  body: formData,
});
```

## Response

### Success (201 Created)
```json
{
  "postId": "a1b2c3d4"
}
```

### Error (400 Bad Request)
```json
{
  "message": "title is required"
}
```

### Error (500 Internal Server Error)
```json
{
  "message": "Internal server error",
  "error": "Error details"
}
```

## File Constraints
- **Allowed formats**: JPEG, JPG, PNG, GIF, WebP
- **Max file size**: 5MB per image
- **Max step images**: 20

## Image URLs
Uploaded images will be accessible at:
```
/api/posts/files/{filename}
```

## Notes
1. The endpoint uses multer for file handling
2. Files are stored in the `uploads/` directory
3. Filenames are automatically generated with timestamp + random suffix
4. The legacy JSON-only endpoint is still available at `POST /api/posts/json` for backward compatibility
