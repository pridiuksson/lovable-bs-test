import React, { useState, useEffect } from 'react';
import ImageGrid from '@/components/ImageGrid';
import TextEditor from '@/components/TextEditor';
import DebugPanel from '@/components/DebugPanel';
import AuthButton from '@/components/AuthButton';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { Download, Save, Bug, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
const Index = () => {
  const {
    user,
    isLoading: isAuthLoading
  } = useAuth();
  const [images, setImages] = useState<(string | null)[]>(Array(9).fill(null));
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingSlots, setUploadingSlots] = useState<number[]>([]);
  const [isPageLoaded, setIsPageLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  // Placeholders for each grid cell
  const placeholders = ['random photo', 'food', 'animal', 'my music', 'face', 'book', 'hobbie', 'movie', 'full body'];

  // Load images from Supabase Storage when user changes or on component mount
  useEffect(() => {
    const loadImagesFromSupabase = async () => {
      if (!user && !isAuthLoading) {
        // If no user is logged in and auth loading is complete, reset images
        setImages(Array(9).fill(null));
        setIsLoading(false);
        return;
      }
      if (isAuthLoading) {
        // Still checking auth status, wait
        return;
      }
      setIsLoading(true);
      try {
        // List all files in the bucket
        const {
          data: files,
          error
        } = await supabase.storage.from('nine-picture-grid-images').list();
        if (error) {
          throw error;
        }

        // Dispatch a debug event
        const event = new CustomEvent('app-debug', {
          detail: {
            type: 'info',
            message: 'Files loaded from storage',
            details: {
              files,
              userId: user?.id
            }
          }
        });
        window.dispatchEvent(event);
        if (files && files.length > 0) {
          const newImages = Array(9).fill(null);
          const userPrefix = user ? `user-${user.id}` : '';

          // Process each file
          for (const file of files) {
            // Only load files belonging to the current user
            if (user && file.name.startsWith(userPrefix)) {
              // Extract slot number from filename (user-ID-slot-N-timestamp)
              const match = file.name.match(/slot-(\d+)-/);
              if (match && match[1]) {
                const slotIndex = parseInt(match[1]) - 1;
                if (slotIndex >= 0 && slotIndex < 9) {
                  const {
                    data
                  } = supabase.storage.from('nine-picture-grid-images').getPublicUrl(file.name);
                  newImages[slotIndex] = data.publicUrl;
                }
              }
            } else if (!userPrefix && file.name.match(/^slot-\d+-/)) {
              // For backward compatibility: load files without user prefix
              // Only if no user is logged in
              const match = file.name.match(/^slot-(\d+)-/);
              if (match && match[1]) {
                const slotIndex = parseInt(match[1]) - 1;
                if (slotIndex >= 0 && slotIndex < 9) {
                  const {
                    data
                  } = supabase.storage.from('nine-picture-grid-images').getPublicUrl(file.name);
                  newImages[slotIndex] = data.publicUrl;
                }
              }
            }
          }
          setImages(newImages);
        }
      } catch (error: any) {
        console.error('Error loading images:', error);

        // Dispatch a debug event
        const event = new CustomEvent('app-debug', {
          detail: {
            type: 'error',
            message: 'Failed to load images from storage',
            details: error
          }
        });
        window.dispatchEvent(event);
        toast({
          title: "Failed to load images",
          description: error.message || "There was an error loading your images from storage.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadImagesFromSupabase();
  }, [user, isAuthLoading]); // Reload when user changes or auth loading completes

  // Simulate page load animation
  useEffect(() => {
    setTimeout(() => {
      setIsPageLoaded(true);
    }, 100);
  }, []);
  const handleImagesChange = (newImages: (string | null)[]) => {
    setImages(newImages);
  };
  const handleStartImageUpload = (index: number) => {
    setUploadingSlots(prev => [...prev, index]);
  };
  const handleFinishImageUpload = (index: number) => {
    setUploadingSlots(prev => prev.filter(slot => slot !== index));
  };
  const handleSave = () => {
    setIsSaving(true);

    // Since we're already saving images to Supabase on upload,
    // we just need to show a success message here
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Successfully saved",
        description: "Your images have been saved to Supabase storage"
      });
    }, 1000);
  };
  const handleDownload = () => {
    // Create a JSON object with the current state
    const dataToExport = {
      images,
      text
    };

    // Convert to a JSON string
    const jsonString = JSON.stringify(dataToExport, null, 2);

    // Create a blob from the JSON string
    const blob = new Blob([jsonString], {
      type: 'application/json'
    });

    // Create a URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a link element and trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nine-picture-grid.json';
    document.body.appendChild(a);
    a.click();

    // Clean up
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "Download started",
      description: "Your grid data is being downloaded"
    });
  };
  return <div className={cn("min-h-screen w-full bg-gradient-to-b from-background to-secondary/50", "flex flex-col items-center justify-start py-12 px-6", "transition-opacity duration-500", isPageLoaded ? "opacity-100" : "opacity-0")}>
      <div className="w-full max-w-4xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-center space-y-3 md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              Nine Picture Grid
            </h1>
            <p className="text-muted-foreground max-w-2xl">Made with Lovable, 5 prompts per day</p>
          </div>
          <AuthButton />
        </header>
        
        {!user && !isAuthLoading && <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Authentication required</AlertTitle>
            <AlertDescription>
              You need to sign in to upload images. Please log in or create an account.
            </AlertDescription>
          </Alert>}
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="main">Grid Editor</TabsTrigger>
            <TabsTrigger value="debug" className="flex items-center gap-1">
              <Bug className="h-4 w-4" />
              Debug Info
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="main">
            {isLoading ? <div className="flex justify-center items-center h-64">
                <div className="w-12 h-12 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
              </div> : <div className={cn("glass-morphism rounded-xl p-6 shadow-sm", "transition-all duration-500 ease-out", "transform opacity-100 scale-100", !isPageLoaded && "opacity-0 scale-95")}>
                <ImageGrid images={images} placeholders={placeholders} onImagesChange={handleImagesChange} uploadingSlots={uploadingSlots} onStartUpload={handleStartImageUpload} onFinishUpload={handleFinishImageUpload} isAuthenticated={!!user} userId={user?.id} />
                
                <TextEditor text={text} onTextChange={setText} />
                
                <div className="flex justify-end mt-6 space-x-3">
                  <Button variant="outline" onClick={handleDownload} className="h-10 px-4 py-2">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  
                  <Button onClick={handleSave} disabled={isSaving || !user} className="h-10 px-4 py-2">
                    {isSaving ? <span className="animate-pulse">Saving...</span> : <>
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </>}
                  </Button>
                </div>
              </div>}
          </TabsContent>
          
          <TabsContent value="debug">
            <div className={cn("glass-morphism rounded-xl p-6 shadow-sm", "transition-all duration-500 ease-out", "transform opacity-100 scale-100", !isPageLoaded && "opacity-0 scale-95")}>
              <DebugPanel />
            </div>
          </TabsContent>
        </Tabs>
        
        <footer className="text-center text-sm text-muted-foreground pt-6">
          <p>© {new Date().getFullYear()} Nine Picture Grid. All rights reserved.</p>
        </footer>
      </div>
    </div>;
};
export default Index;