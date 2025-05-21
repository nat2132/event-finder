import React, { useRef, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface ProfileImageUploadProps {
  imageUrl?: string;
  onChange: (file: File | null) => void;
  onRemove?: () => void;
  name?: string;
}

export const ProfileImageUpload: React.FC<ProfileImageUploadProps> = ({ imageUrl, onChange, onRemove, name }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | undefined>(imageUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      onChange(file);
    } else {
      setPreview(imageUrl);
      onChange(null);
    }
  };

  const handleRemove = () => {
    setPreview(undefined);
    onChange(null);
    if (onRemove) onRemove();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Avatar className="h-20 w-20">
        {preview ? (
          <AvatarImage src={preview} alt="Profile preview" />
        ) : (
          <AvatarFallback>IMG</AvatarFallback>
        )}
      </Avatar>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        name={name || 'profile-image'}
      />
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
          {preview ? 'Change Image' : 'Upload Image'}
        </Button>
        {preview && (
          <Button type="button" variant="destructive" onClick={handleRemove}>
            Remove
          </Button>
        )}
      </div>
    </div>
  );
};
