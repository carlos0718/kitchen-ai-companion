-- Add image_url column to messages table for image-in-chat feature
ALTER TABLE messages ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images to chat-images bucket
CREATE POLICY "Users can upload chat images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read of chat images
CREATE POLICY "Chat images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-images');
