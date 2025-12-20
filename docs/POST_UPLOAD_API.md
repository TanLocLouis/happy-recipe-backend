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
- `servings` (optional): number - Number of servings
- `difficulty` (optional): 'easy' | 'medium' | 'hard'

### Cover Image
- `coverImgFile` (optional): File - Cover image for the post

### Ingredients
Ingredients should be sent as indexed form fields:
- `ingredients[0][itemOrder]`: number
- `ingredients[0][ingredientText]`: string
- `ingredients[1][itemOrder]`: number
- `ingredients[1][ingredientText]`: string
- ... and so on

### Steps
Steps should be sent as indexed form fields:
- `steps[0][stepNum]`: number
- `steps[0][stepDesc]`: string
- `steps[1][stepNum]`: number
- `steps[1][stepDesc]`: string
- ... and so on

### Step Images
Step images should be sent with indexed fieldnames:
- `stepImgFiles[0]`: File - Image for step 0
- `stepImgFiles[1]`: File - Image for step 1
- ... and so on

## Frontend Implementation Example

```typescript
export async function uploadPost(data: uploadPostStructure, accessToken: string) {
  const formData = new FormData();
  
  // Basic fields
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('cookTime', data.cookTime.toString());
  formData.append('servings', data.servings.toString());
  formData.append('difficulty', data.difficulty);
  
  // Cover image
  if (data.coverImgFile) {
    formData.append('coverImgFile', data.coverImgFile);
  }
  
  // Ingredients (if you add them to the interface)
  // data.ingredients?.forEach((ing, index) => {
  //   formData.append(`ingredients[${index}][itemOrder]`, ing.itemOrder.toString());
  //   formData.append(`ingredients[${index}][ingredientText]`, ing.ingredientText);
  // });
  
  // Steps
  data.steps.forEach((step, index) => {
    formData.append(`steps[${index}][stepNum]`, step.stepNum.toString());
    formData.append(`steps[${index}][stepDesc]`, step.stepDesc);
    
    // Step image
    if (step.stepImgFile) {
      formData.append(`stepImgFiles[${index}]`, step.stepImgFile);
    }
  });
  
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // Note: Do NOT set Content-Type header - browser will set it automatically with boundary
    },
    body: formData,
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.message || 'Failed to create post');
  }
  
  return await res.json();
}
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
