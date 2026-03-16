import {useState, KeyboardEvent, useRef, useCallback} from 'react';
import {Button} from '@/components/ui/button';
import {Textarea} from '@/components/ui/textarea';
import {ArrowUp, ImagePlus, Loader2, X} from 'lucide-react';

type ImageItem = {base64: string; mimeType: string; preview: string};

interface ChatInputProps {
	onSend: (message: string, images?: ImageItem[]) => void;
	isLoading: boolean;
	placeholder?: string;
}

const MAX_IMAGES = 4;
const MAX_DIMENSION = 1024;
const JPEG_QUALITY = 0.75;

function compressImage(file: File): Promise<ImageItem> {
	return new Promise((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const img = new Image();
		img.onerror = reject;
		img.onload = () => {
			let {width, height} = img;
			if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
				if (width >= height) {
					height = Math.round((height * MAX_DIMENSION) / width);
					width = MAX_DIMENSION;
				} else {
					width = Math.round((width * MAX_DIMENSION) / height);
					height = MAX_DIMENSION;
				}
			}
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext('2d')!;
			ctx.drawImage(img, 0, 0, width, height);
			URL.revokeObjectURL(objectUrl);
			const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
			resolve({base64: dataUrl.split(',')[1], mimeType: 'image/jpeg', preview: dataUrl});
		};
		img.src = objectUrl;
	});
}

export function ChatInput({onSend, isLoading, placeholder}: ChatInputProps) {
	const [input, setInput] = useState('');
	const [images, setImages] = useState<ImageItem[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const processFile = useCallback(async (file: File) => {
		if (!file.type.startsWith('image/')) return;
		if (images.length >= MAX_IMAGES) return;
		try {
			const item = await compressImage(file);
			setImages(current => {
				if (current.length >= MAX_IMAGES) return current;
				return [...current, item];
			});
		} catch (e) {
			console.error('Error compressing image:', e);
		}
	}, [images.length]);

	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			const items = e.clipboardData?.items;
			if (!items) return;
			for (const item of items) {
				if (item.type.startsWith('image/')) {
					e.preventDefault();
					const file = item.getAsFile();
					if (file) processFile(file);
					break;
				}
			}
		},
		[processFile]
	);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) processFile(file);
		e.target.value = '';
	};

	const removeImage = (index: number) => {
		setImages(prev => prev.filter((_, i) => i !== index));
	};

	const handleSend = () => {
		const hasText = input.trim();
		const hasImages = images.length > 0;
		if ((!hasText && !hasImages) || isLoading) return;
		onSend(input.trim(), hasImages ? images : undefined);
		setInput('');
		setImages([]);
	};

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	const canSend = (input.trim().length > 0 || images.length > 0) && !isLoading;

	return (
		<div className='bg-background/80 backdrop-blur-sm border-t border-border/50'>
			<div className='max-w-5xl mx-auto px-4 py-3'>
				{/* Image previews */}
				{images.length > 0 && (
					<div className='mb-3 flex flex-wrap gap-2 px-1'>
						{images.map((img, idx) => (
							<div key={idx} className='relative inline-block group'>
								<img
									src={img.preview}
									alt={`Imagen ${idx + 1}`}
									className='h-20 w-auto rounded-xl border-2 border-border object-cover shadow-sm transition-transform group-hover:scale-[1.02]'
								/>
								<button
									type='button'
									title='Eliminar imagen'
									aria-label='Eliminar imagen'
									onClick={() => removeImage(idx)}
									className='absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/80'
								>
									<X className='h-3 w-3' />
								</button>
							</div>
						))}
						{images.length < MAX_IMAGES && (
							<button
								type='button'
								title='Agregar otra imagen'
								aria-label='Agregar otra imagen'
								onClick={() => fileInputRef.current?.click()}
								className='h-20 w-20 rounded-xl border-2 border-dashed border-border/70 flex items-center justify-center text-muted-foreground hover:border-primary/60 hover:text-primary hover:bg-accent/40 transition-all'
							>
								<ImagePlus className='h-5 w-5' />
							</button>
						)}
					</div>
				)}

				{/* Input container */}
				<div className='relative flex items-end gap-2 bg-card rounded-2xl border-2 border-border/70 shadow-sm focus-within:border-primary/50 focus-within:shadow-md transition-all duration-200 px-3 py-2'>
					{/* Image picker */}
					{images.length === 0 && (
						<button
							type='button'
							onClick={() => fileInputRef.current?.click()}
							disabled={isLoading}
							title='Adjuntar imagen'
							aria-label='Adjuntar imagen'
							className='shrink-0 mb-1 p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent/50 transition-colors disabled:opacity-40'
						>
							<ImagePlus className='h-4.5 w-4.5' />
						</button>
					)}

					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						onPaste={handlePaste}
						placeholder={placeholder || 'Escribe tus ingredientes o una pregunta de cocina...'}
						className='flex-1 min-h-[40px] max-h-[160px] resize-none bg-transparent border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 py-1.5 px-1 text-base placeholder:text-muted-foreground/60'
						disabled={isLoading}
					/>

					{/* Send button */}
					<Button
						type='button'
						onClick={handleSend}
						disabled={!canSend}
						size='icon'
						title='Enviar mensaje'
						aria-label='Enviar mensaje'
						className={`shrink-0 mb-1 h-9 w-9 rounded-xl transition-all duration-200 ${
							canSend
								? 'bg-primary hover:bg-primary/85 text-primary-foreground shadow-sm shadow-primary/25 scale-100'
								: 'bg-muted text-muted-foreground scale-95 opacity-60'
						}`}
					>
						{isLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : <ArrowUp className='h-4 w-4' />}
					</Button>
				</div>

				<input
					ref={fileInputRef}
					type='file'
					accept='image/*'
					className='hidden'
					aria-label='Seleccionar imagen'
					title='Seleccionar imagen'
					onChange={handleFileChange}
				/>
			</div>
		</div>
	);
}
