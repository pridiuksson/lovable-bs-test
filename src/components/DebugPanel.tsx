
import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Trash, DownloadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface LogEntry {
  id: string;
  timestamp: Date;
  type: 'error' | 'info' | 'warning';
  message: string;
  details?: any;
}

const DebugPanel = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bucketStatus, setBucketStatus] = useState<'checking' | 'exists' | 'not-exists' | 'error'>('checking');
  const [policiesInfo, setPoliciesInfo] = useState<string>('Checking RLS policies...');

  // Add a log entry
  const addLog = (type: 'error' | 'info' | 'warning', message: string, details?: any) => {
    setLogs(prevLogs => [
      {
        id: Date.now().toString(),
        timestamp: new Date(),
        type,
        message,
        details
      },
      ...prevLogs
    ]);
  };

  // Check bucket existence
  useEffect(() => {
    const checkBucket = async () => {
      try {
        // List buckets to see if our bucket exists
        const { data, error } = await supabase.storage.listBuckets();
        
        if (error) {
          setBucketStatus('error');
          addLog('error', 'Failed to list storage buckets', error);
          return;
        }
        
        const bucketExists = data.some(bucket => bucket.name === 'nine-picture-grid-images');
        setBucketStatus(bucketExists ? 'exists' : 'not-exists');
        
        if (bucketExists) {
          addLog('info', 'Storage bucket "nine-picture-grid-images" exists');
          
          // Check bucket permissions
          try {
            const { data: files, error: listError } = await supabase.storage
              .from('nine-picture-grid-images')
              .list();
              
            if (listError) {
              addLog('error', 'Cannot list files in bucket - possible RLS policy issue', listError);
            } else {
              addLog('info', `Successfully listed ${files?.length || 0} files in bucket`);
            }
          } catch (e) {
            addLog('error', 'Exception when checking bucket permissions', e);
          }
        } else {
          addLog('warning', 'Storage bucket "nine-picture-grid-images" does not exist');
        }
      } catch (e) {
        setBucketStatus('error');
        addLog('error', 'Exception when checking bucket existence', e);
      }
    };

    // Add initial log
    addLog('info', 'Debug panel initialized');
    addLog('info', 'Checking Supabase storage configuration...');
    checkBucket();
    
    // Test creating the bucket if it doesn't exist
    setTimeout(() => {
      if (bucketStatus === 'not-exists') {
        createBucket();
      }
    }, 1000);
    
    // Check RLS policies explanation
    setPoliciesInfo(
      'Row Level Security (RLS) issue detected. The error "new row violates row-level security policy" ' +
      'indicates that the current user does not have permission to upload files to the bucket. ' +
      'This typically happens when RLS policies are not properly configured for anonymous (non-authenticated) users.'
    );
    
    // Listen for custom debug events from the application
    const handleDebugEvent = (event: CustomEvent) => {
      if (event.detail) {
        const { type, message, details } = event.detail;
        addLog(type || 'info', message, details);
      }
    };
    
    window.addEventListener('app-debug', handleDebugEvent as EventListener);
    
    return () => {
      window.addEventListener('app-debug', handleDebugEvent as EventListener);
    };
  }, [bucketStatus]);

  // Create storage bucket
  const createBucket = async () => {
    addLog('info', 'Attempting to create storage bucket "nine-picture-grid-images"...');
    
    try {
      const { data, error } = await supabase.storage.createBucket('nine-picture-grid-images', { 
        public: true 
      });
      
      if (error) {
        addLog('error', 'Failed to create bucket', error);
      } else {
        addLog('info', 'Successfully created bucket', data);
        setBucketStatus('exists');
      }
    } catch (e) {
      addLog('error', 'Exception when creating bucket', e);
    }
  };

  // Test upload to see if it works
  const testUpload = async () => {
    addLog('info', 'Testing file upload to Supabase...');
    
    // Create a small test file
    const testFile = new File(['test content'], 'test-upload.txt', { type: 'text/plain' });
    
    try {
      const { data, error } = await supabase.storage
        .from('nine-picture-grid-images')
        .upload(`test-${Date.now()}.txt`, testFile, {
          cacheControl: '3600',
          upsert: true
        });
        
      if (error) {
        addLog('error', 'Test upload failed', error);
      } else {
        addLog('info', 'Test upload successful', data);
      }
    } catch (e) {
      addLog('error', 'Exception during test upload', e);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setLogs([]);
    addLog('info', 'Logs cleared');
  };

  // Download logs as JSON
  const downloadLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Debug Information</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={testUpload}>
            Test Upload
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            <Trash className="h-4 w-4 mr-1" />
            Clear Logs
          </Button>
          <Button variant="outline" size="sm" onClick={downloadLogs}>
            <DownloadCloud className="h-4 w-4 mr-1" />
            Download Logs
          </Button>
        </div>
      </div>
      
      <div className="space-y-4">
        <Alert variant={bucketStatus === 'exists' ? 'default' : 'destructive'}>
          <AlertTitle>Storage Bucket Status</AlertTitle>
          <AlertDescription>
            {bucketStatus === 'checking' && 'Checking storage bucket configuration...'}
            {bucketStatus === 'exists' && 'Storage bucket "nine-picture-grid-images" exists.'}
            {bucketStatus === 'not-exists' && 'Storage bucket "nine-picture-grid-images" does not exist!'}
            {bucketStatus === 'error' && 'Error checking storage bucket status.'}
          </AlertDescription>
        </Alert>
        
        <Alert variant="destructive">
          <AlertTitle>Row Level Security (RLS) Issue Detected</AlertTitle>
          <AlertDescription>
            <p>{policiesInfo}</p>
            <div className="mt-2 text-sm">
              <strong>Resolution:</strong> You need to configure a storage policy in Supabase that allows anonymous uploads:
              <pre className="mt-1 p-2 bg-background border rounded-md overflow-auto">
                {`-- Run this SQL in your Supabase SQL editor
CREATE POLICY "Allow anonymous uploads" 
ON storage.objects 
FOR INSERT 
TO anon 
WITH CHECK (bucket_id = 'nine-picture-grid-images');`}
              </pre>
            </div>
          </AlertDescription>
        </Alert>
      </div>
      
      <div>
        <h3 className="text-sm font-medium mb-2">Event Logs</h3>
        <ScrollArea className="h-[300px] rounded-md border">
          <div className="p-4 space-y-2">
            {logs.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No logs to display</p>
            ) : (
              logs.map((log) => (
                <div 
                  key={log.id}
                  className={cn(
                    "p-2 rounded-md text-sm",
                    log.type === 'error' && "bg-destructive/10 border border-destructive/20",
                    log.type === 'warning' && "bg-amber-500/10 border border-amber-500/20",
                    log.type === 'info' && "bg-primary/5 border border-primary/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={cn(
                      "font-medium",
                      log.type === 'error' && "text-destructive",
                      log.type === 'warning' && "text-amber-500",
                      log.type === 'info' && "text-primary"
                    )}>
                      {log.type.toUpperCase()}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p>{log.message}</p>
                  {log.details && (
                    <pre className="mt-1 p-1 bg-background rounded-sm text-xs overflow-auto">
                      {typeof log.details === 'string' 
                        ? log.details 
                        : JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default DebugPanel;
