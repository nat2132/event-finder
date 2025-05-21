// API utility for user profile updates and deletion
import axios from 'axios';

export async function updateUserProfile(data: {
  first_name?: string;
  last_name?: string;
  email?: string;
  image?: File | string;
  profile_image?: File | string;
  bio?: string;
}, token: string) {
  const formData = new FormData();
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, value);
    }
  });
  const res = await axios.put('/api/user/profile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
      'Authorization': `Bearer ${token}`,
    },
  });
  return res.data;
}


export async function updateUserPassword(data: { password: string }) {
  const res = await axios.post('/api/user/password', data);
  return res.data;
}

export async function deleteUserFromBackend(clerkId: string) {
  // Call your backend endpoint to remove user data
  const res = await axios.delete(`/api/user/${clerkId}`);
  return res.data;
}
