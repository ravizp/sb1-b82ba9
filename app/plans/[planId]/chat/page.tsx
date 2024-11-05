"use client";

import { useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { socket } from '@/lib/socket';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImagePlus, Send } from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';

interface Message {
  _id: string;
  planId: string;
  clerkId: string;
  message: string;
  imageUrl?: string;
  createdAt: string;
}

export default function ChatRoom({ params }: { params: { planId: string } }) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Join room
    socket.emit('join-room', params.planId);

    // Fetch existing messages
    const fetchMessages = async () => {
      const response = await fetch(`/api/messages?planId=${params.planId}`);
      const data = await response.json();
      if (data.success) {
        setMessages(data.messages);
      }
    };

    fetchMessages();

    // Listen for new messages
    socket.on('receive-message', (newMessage: Message) => {
      setMessages((prev) => [...prev, newMessage]);
    });

    return () => {
      socket.off('receive-message');
    };
  }, [params.planId, user]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newMessage.trim() && !imageFile)) return;

    try {
      let imageData;
      if (imageFile) {
        const reader = new FileReader();
        imageData = await new Promise((resolve) => {
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(imageFile);
        });
      }

      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMessage,
          planId: params.planId,
          clerkId: user.id,
          imageData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        socket.emit('send-message', data.message);
        setNewMessage('');
        setImageFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex-1 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={msg._id || index}
                className={`flex ${
                  msg.clerkId === user?.id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.clerkId === user?.id
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100'
                  }`}
                >
                  {msg.imageUrl && (
                    <div className="mb-2">
                      <Image
                        src={msg.imageUrl}
                        alt="Shared image"
                        width={300}
                        height={200}
                        className="rounded-lg"
                      />
                    </div>
                  )}
                  <p>{msg.message}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {format(new Date(msg.createdAt), 'HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSubmit} className="p-4 bg-gray-50">
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageChange}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleImageClick}
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button type="submit">
              <Send className="h-5 w-5" />
            </Button>
          </div>
          {imageFile && (
            <div className="mt-2 text-sm text-gray-600">
              Selected image: {imageFile.name}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}