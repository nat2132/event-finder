import * as React from "react"
import { Camera, Trash2, Upload } from "lucide-react"
import { motion } from "framer-motion"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ProfileImageUploadProps {
  defaultImage?: string
  fallback?: string
  className?: string
  onChange?: (file: File | null) => void
}

export function ProfileImageUpload({ defaultImage, fallback = "AB", className, onChange, onUploadSuccess }: ProfileImageUploadProps & { onUploadSuccess?: () => void }) {
  const [image, setImage] = React.useState<string | null>(defaultImage || null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Process image URL to handle different formats
  const processImageUrl = (url: string | null | undefined): string => {
    if (!url) return "";
    
    // Handle backend media paths
    if (url.startsWith('/media/')) {
      return `${window.location.protocol}//${window.location.hostname}:8000${url}`;
    }
    
    // Handle localhost HTTPS URLs (convert to HTTP for mixed content issues)
    if (url.startsWith('https://127.0.0.1:8000/') || url.startsWith('https://localhost:8000/')) {
      return url.replace('https://', 'http://');
    }
    
    return url;
  };

  // Sync internal image state with defaultImage prop
  React.useEffect(() => {
    setImage(defaultImage || null);
  }, [defaultImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setImage(result)
        onChange?.(file);
        if (onUploadSuccess) onUploadSuccess();
      }
      reader.readAsDataURL(file)
    }
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleRemoveImage = () => {
    setImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
    onChange?.(null)
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <motion.div whileHover={{ scale: 1.05 }} transition={{ type: "spring", stiffness: 300 }}>
          <Avatar className="h-24 w-24 ">
            <AvatarImage 
              src={image || processImageUrl(defaultImage) || ""} 
              alt="Profile" 
              onError={(e) => {
                console.log("Profile avatar failed to load:", e.currentTarget.src);
                e.currentTarget.style.display = 'none';
              }}
            />
            <AvatarFallback className="text-2xl">{fallback}</AvatarFallback>
          </Avatar>
        </motion.div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full shadow-md z-50"
            >
              <Camera className="h-4 w-4" />
              <span className="sr-only">Change profile picture</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" >
            <DropdownMenuItem onClick={handleUploadClick}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleRemoveImage} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remove Image
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
        aria-label="Upload profile picture"
      />
    </div>
  )
}
