import { apiRequest } from './client.js';
export const contentAPI = {
    async getAll() {
        const response = await apiRequest('/api/content');
        return response.data;
    },
    async getById(id) {
        const response = await apiRequest(`/api/content/${id}`);
        return response.content;
    },
    async delete(id) {
        await apiRequest(`/api/content/${id}`, {
            method: 'DELETE',
        });
    },
};
export function uploadContent(file, source, onProgress) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('source', source);
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const xhr = new XMLHttpRequest();
        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    onProgress(percentComplete);
                }
            });
        }
        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.content);
                }
                catch (error) {
                    reject(new Error('Failed to parse upload response'));
                }
            }
            else {
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    reject(new Error(errorResponse.error || `Upload failed with status ${xhr.status}`));
                }
                catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        });
        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });
        xhr.addEventListener('abort', () => {
            reject(new Error('Upload aborted'));
        });
        xhr.open('POST', `${apiUrl}/api/content/upload`);
        xhr.send(formData);
    });
}
