# Frontend Upload Implementation

## ❌ WRONG - Don't do this:
```typescript
// This WON'T work - sending File object in JSON body
const response = await fetch(`${API_URL}/api/posts`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",  // ❌ Wrong
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify(uploadPost),  // ❌ Files can't be stringified
});
```

## ✅ CORRECT - Use FormData:
```typescript
export async function pushPost(data: uploadPostStructure, accessToken: string) {
  const formData = new FormData();
  
  // 1. Add basic text fields
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('cookTime', data.cookTime.toString());
  formData.append('servings', data.servings.toString());
  formData.append('difficulty', data.difficulty);
  
  // 2. Add cover image FILE (not as JSON!)
  if (data.coverImgFile && data.coverImgFile instanceof File) {
    formData.append('coverImgFile', data.coverImgFile);
  }
  
  // 3. Add steps as JSON string
  formData.append('steps', JSON.stringify(data.steps));
  
  // 4. Add step images as separate files
  data.steps.forEach((step, index) => {
    if (step.stepImgFile && step.stepImgFile instanceof File) {
      formData.append(`stepImgFiles[${index}]`, step.stepImgFile);
    }
  });
  
  // 5. Send the request
  const response = await fetch(`${import.meta.env.VITE_API_URL}/api/posts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // ⚠️ DO NOT set Content-Type header - browser sets it automatically with boundary
    },
    body: formData,  // Send FormData, not JSON
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to create post');
  }
  
  return await response.json();
}
```

## Alternative: Send steps as form fields
```typescript
// Instead of JSON.stringify(steps), you can send individual fields:
data.steps.forEach((step, index) => {
  formData.append(`steps[${index}][stepNum]`, step.stepNum.toString());
  formData.append(`steps[${index}][stepDesc]`, step.stepDesc);
  // Images still go separately
  if (step.stepImgFile) {
    formData.append(`stepImgFiles[${index}]`, step.stepImgFile);
  }
});
```

## Key Points:
1. **Use FormData**, not JSON.stringify()
2. **Files must be appended directly** to FormData (coverImgFile, stepImgFiles)
3. **Don't set Content-Type header** - browser adds multipart boundary automatically
4. **Text data** (title, description, etc.) can be strings
5. **Arrays/objects** can be sent as JSON strings OR as indexed form fields

## Debugging
Check browser DevTools Network tab:
- Request should show "Content-Type: multipart/form-data; boundary=..."
- Form Data section should show files with their sizes
- Files should NOT appear as `[object File]` or `{}`
