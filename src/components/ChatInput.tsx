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

export function ChatInput({onSend, isLoading, placeholder}: ChatInputProps) {
	const [input, setInput] = useState('');
	const [images, setImages] = useState<ImageItem[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const processFile = useCallback((file: File) => {
		if (!file.type.startsWith('image/')) return;
		setImages(prev => {
			if (prev.length >= MAX_IMAGES) return prev;
			const reader = new FileReader();
			reader.onload = (e) => {
				const dataUrl = e.target?.result as string;
				const base64 = dataUrl.split(',')[1];
				setImages(current => {
					if (current.length >= MAX_IMAGES) return current;
					return [...current, {base64, mimeType: file.type, preview: dataUrl}];
				});
			};
			reader.readAsDataURL(file);
			return prev;
		});
	}, []);

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

	const canSend = (input.trim() || images.length > 0) && !isLoading;

	return (
		<div className='p-4 border-t border-border bg-card'>
			<div className='relative max-w-3xl mx-auto'>
				{/* Image previews */}
				{images.length > 0 && (
					<div className='mb-2 flex flex-wrap gap-2'>
						{images.map((img, idx) => (
							<div key={idx} className='relative inline-block'>
								<img src={img.preview} alt={`Imagen ${idx + 1}`} className='h-20 w-auto rounded-lg border border-border object-cover' />
								<button
									title='Eliminar imagen'
									aria-label='Eliminar imagen'
									onClick={() => removeImage(idx)}
									className='absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:bg-destructive/90'
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
								className='h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors'
							>
								<ImagePlus className='h-5 w-5' />
							</button>
						)}
					</div>
				)}

				<div className='relative'>
					<Textarea
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						onPaste={handlePaste}
						placeholder={placeholder || 'Escribe tus ingredientes o pregunta una receta...'}
						className='min-h-[52px] max-h-[200px] resize-none bg-background pr-24 py-3 rounded-2xl border-2 focus:border-primary/50 transition-colors'
						disabled={isLoading}
					/>

					{/* Image picker button */}
					{images.length === 0 && (
						<Button
							type='button'
							onClick={() => fileInputRef.current?.click()}
							disabled={isLoading}
							size='icon'
							variant='ghost'
							title='Adjuntar imagen'
							aria-label='Adjuntar imagen'
							className='absolute right-12 bottom-2 h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground'
						>
							<ImagePlus className='h-4 w-4' />
						</Button>
					)}

					{/* Send button */}
					<Button
						type='button'
						onClick={handleSend}
						disabled={!canSend}
						size='icon'
						title='Enviar mensaje'
						aria-label='Enviar mensaje'
						className={`absolute right-2 bottom-2 h-9 w-9 rounded-xl transition-all ${
							canSend ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : 'bg-muted text-muted-foreground'
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
