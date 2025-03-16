
import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface TextEditorProps {
  text: string;
  onTextChange: (text: string) => void;
}

const TextEditor: React.FC<TextEditorProps> = ({ text, onTextChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [textareaHeight, setTextareaHeight] = useState('120px');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Adjust height based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const newHeight = Math.max(120, scrollHeight); // Minimum 120px
      setTextareaHeight(`${newHeight}px`);
    }
  }, [text]);

  return (
    <div className={cn(
      "w-full max-w-4xl mx-auto mt-6 transition-all duration-300",
      "rounded-lg", 
      "bg-white/50 backdrop-blur-sm",
      "border",
      isFocused ? "border-primary/50 shadow-sm" : "border-border",
    )}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder="Add your description here..."
        className={cn(
          "w-full p-4 bg-transparent",
          "rounded-lg resize-none outline-none",
          "text-foreground placeholder:text-muted-foreground/70",
          "transition-all duration-300 ease-in-out",
        )}
        style={{ height: textareaHeight }}
      />
    </div>
  );
};

export default TextEditor;
