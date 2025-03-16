
import React, { useState, useRef } from 'react';
import { Plus, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

const emitDebugEvent = (type: 'error' | 'info' | 'warning', message: string, details?: any) => {
  const event = new CustomEvent('app-debug', {
    detail: { type, message, details }
  });
  window.dispatchEvent(event);
};

interface ImageCellProps {
  index: number;
  image: string | null;
  placeholder: string;
  onImageChange: (index: number, file: File | null) => void;
  isUploading: boolean;
  onZoom: (image: string, index: number) => void;
}

const ImageCell: React.FC<ImageCellProps> = ({ 
  index, 
  image, 
  placeholder, 
  onImageChange, 
  isUploading,
  onZoom 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (!image) {
      fileInputRef.current?.click();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (image) {
      e.preventDefault(); // Prevent default behavior
      onZoom(image, index);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith('image/')) {
        const errorMessage = "Invalid file type - please select an image file";
        toast({
          title: "Invalid file type",
          description: errorMessage,
          variant: "destructive",
        });
        emitDebugEvent('error', errorMessage, { fileType: file.type });
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        const errorMessage = `File too large (${(file.size/1024/1024).toFixed(2)}MB) - limit is 5MB`;
        toast({
          title: "File too large",
          description: errorMessage,
          variant: "destructive",
        });
        emitDebugEvent('error', errorMessage, { fileSize: file.size });
        return;
      }

      emitDebugEvent('info', `File selected for upload in slot ${index + 1}`, { 
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      });
      
      onImageChange(index, file);
    }
  };

  const handleRemoveImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(index, null);
  };

  return (
    <div 
      className={cn(
        "image-cell relative flex items-center justify-center w-full h-full aspect-square overflow-hidden",
        "border rounded-md transition-all duration-300 group",
        image ? "bg-accent/5" : "bg-secondary hover:bg-secondary/80",
        "hover:shadow-md",
        isUploading && "opacity-70 pointer-events-none",
        !image && "cursor-pointer"
      )}
      onClick={handleClick}
      onMouseDown={handleMouseDown}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
      
      {image ? (
        <>
          <div className="w-full h-full relative overflow-hidden">
            <img 
              src={image} 
              alt={`Grid image ${index + 1}`} 
              className="w-full h-full object-cover animate-fade-in"
            />
          </div>
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300">
            <button 
              className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 text-gray-700 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200"
              onClick={handleRemoveImage}
              aria-label="Remove image"
            >
              <X size={16} className="text-gray-700" />
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <Plus size={20} className="text-muted-foreground" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{placeholder || 'Add Image'}</span>
        </div>
      )}
      
      {isUploading && (
        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

interface ImageGridProps {
  images: (string | null)[];
  placeholders: string[];
  onImagesChange: (newImages: (string | null)[]) => void;
  uploadingSlots: number[];
  onStartUpload?: (index: number) => void;
  onFinishUpload?: (index: number) => void;
  isAuthenticated?: boolean;
  userId?: string | null;
}

const ImageGrid: React.FC<ImageGridProps> = ({ 
  images, 
  placeholders, 
  onImagesChange, 
  uploadingSlots,
  onStartUpload,
  onFinishUpload,
  isAuthenticated = true,
  userId = null
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomedIndex, setZoomedIndex] = useState<number | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const handleImageChange = async (index: number, file: File | null) => {
    const newImages = [...images];
    
    if (file) {
      // Include userId in the file name to associate images with users
      const fileName = userId 
        ? `user-${userId}-slot-${index + 1}-${Date.now()}`
        : `slot-${index + 1}-${Date.now()}`;
      
      try {
        // Notify that upload is starting
        if (onStartUpload) {
          onStartUpload(index);
        }
        
        emitDebugEvent('info', `Starting upload to Supabase for slot ${index + 1}`, { fileName, userId });
        
        const { data, error } = await supabase.storage
          .from('nine-picture-grid-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) {
          emitDebugEvent('error', `Supabase upload failed for slot ${index + 1}`, error);
          throw error;
        }

        emitDebugEvent('info', `Upload successful for slot ${index + 1}`, data);

        const { data: publicURL } = supabase.storage
          .from('nine-picture-grid-images')
          .getPublicUrl(data.path);

        newImages[index] = publicURL.publicUrl;
        onImagesChange(newImages);
        
        emitDebugEvent('info', `Public URL obtained for slot ${index + 1}`, { url: publicURL.publicUrl });
        
      } catch (error: any) {
        console.error('Error uploading file:', error);
        emitDebugEvent('error', 'Error uploading file', error);
        
        toast({
          title: "Upload failed",
          description: error.message || "There was an error uploading your image. Please try again.",
          variant: "destructive",
        });
      } finally {
        // Notify that upload is finished
        if (onFinishUpload) {
          onFinishUpload(index);
        }
      }
    } else {
      const currentImageUrl = images[index];
      if (currentImageUrl) {
        const urlParts = currentImageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        emitDebugEvent('info', `Removing image from slot ${index + 1}`, { fileName });
        
        try {
          const { error } = await supabase.storage
            .from('nine-picture-grid-images')
            .remove([fileName]);
            
          if (error) {
            console.error('Error removing file:', error);
            emitDebugEvent('error', 'Error removing file', error);
          } else {
            emitDebugEvent('info', `Successfully removed image from slot ${index + 1}`);
          }
        } catch (error) {
          console.error('Error removing file:', error);
          emitDebugEvent('error', 'Exception when removing file', error);
        }
      }
      
      newImages[index] = null;
      onImagesChange(newImages);
    }
  };

  const handleZoom = (image: string, index: number) => {
    setZoomedImage(image);
    setZoomedIndex(index);
    
    document.addEventListener('mouseup', handleZoomEnd);
    document.addEventListener('mouseleave', handleZoomEnd);
  };
  
  const handleZoomEnd = () => {
    setZoomedImage(null);
    setZoomedIndex(null);
    
    document.removeEventListener('mouseup', handleZoomEnd);
    document.removeEventListener('mouseleave', handleZoomEnd);
  };

  return (
    <div className="w-full max-w-4xl mx-auto" ref={gridRef}>
      <div className="grid grid-cols-3 gap-4 relative">
        {images.map((image, index) => (
          <ImageCell
            key={index}
            index={index}
            image={image}
            placeholder={placeholders[index]}
            onImageChange={handleImageChange}
            isUploading={uploadingSlots.includes(index)}
            onZoom={handleZoom}
          />
        ))}
        
        {zoomedImage && (
          <div 
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 cursor-zoom-out"
            onClick={handleZoomEnd}
          >
            <div className="relative aspect-square w-4/5 max-w-4/5 max-h-4/5 overflow-hidden">
              <img 
                src={zoomedImage} 
                alt={`Zoomed image ${zoomedIndex !== null ? zoomedIndex + 1 : ''}`}
                className="w-full h-full object-cover"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGrid;
