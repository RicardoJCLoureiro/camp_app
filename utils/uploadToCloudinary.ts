// utils/uploadToCloudinary.ts
export async function uploadToCloudinary(file: File): Promise<string> {
    /* 1 – ask our own API for a signed payload */
    const signRes = await fetch('/api/cloudinary-sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileName: file.name }),
    }).then((r) => r.json());
  
    if (!signRes.signature) throw new Error('Could not obtain signature.');
  
    /* 2 – build the form-data request */
    const { timestamp, signature, apiKey, cloudName, folder, public_id } =
      signRes;
  
    const form = new FormData();
    form.append('file', file);
    form.append('timestamp', timestamp);
    form.append('signature', signature);
    form.append('api_key', apiKey);
    form.append('folder', folder);
    form.append('public_id', public_id);
  
    /* 3 – POST directly to Cloudinary */
    const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  
    const res = await fetch(url, { method: 'POST', body: form }).then((r) =>
      r.json(),
    );
  
    if (!res.secure_url) throw new Error('Upload failed');
    return res.secure_url as string;
  }
  