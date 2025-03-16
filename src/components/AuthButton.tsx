
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import AuthModal from './auth/AuthModal';
import { toast } from '@/components/ui/use-toast';

const AuthButton = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setUser(data.session?.user || null);
      } catch (error) {
        console.error('Error getting session:', error);
      } finally {
        setLoading(false);
      }
    };
    
    getInitialSession();
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
        
        // Dispatch a debug event
        const debugEvent = new CustomEvent('app-debug', {
          detail: { 
            type: 'info', 
            message: `Auth state changed: ${event}`,
            details: { event, user: session?.user }
          }
        });
        window.dispatchEvent(debugEvent);
      }
    );
    
    // Cleanup
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
  const handleOpenAuthModal = () => {
    setIsAuthModalOpen(true);
  };
  
  const handleCloseAuthModal = () => {
    setIsAuthModalOpen(false);
  };
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Logged out',
        description: 'You have been logged out successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Logout failed',
        description: error.message || 'Something went wrong.',
        variant: 'destructive',
      });
    }
  };
  
  if (loading) {
    return <Button variant="outline" size="sm" disabled>Loading...</Button>;
  }
  
  if (user) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <User className="h-4 w-4" />
          <span className="hidden sm:inline">{user.email}</span>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout}
          className="flex items-center gap-1"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    );
  }
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={handleOpenAuthModal}
        className="flex items-center gap-1"
      >
        <LogIn className="h-4 w-4" />
        <span>Login</span>
      </Button>
      
      <AuthModal isOpen={isAuthModalOpen} onClose={handleCloseAuthModal} />
    </>
  );
};

export default AuthButton;
