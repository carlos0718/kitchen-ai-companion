-- Add FAQ for the image-in-chat feature (display_order 6 in features category)
INSERT INTO public.faqs (question, answer, category, display_order) VALUES
  (
    '¿Puedo enviar fotos de alimentos al chat?',
    'Sí. Podés adjuntar hasta 4 imágenes por mensaje usando el ícono de imagen en el chat, o simplemente pegando (Ctrl+V / Cmd+V) una foto directamente en el campo de texto. Chef AI analizará visualmente lo que aparece en la imagen — platos preparados, ingredientes, etiquetas nutricionales, o cualquier alimento — y te dará una respuesta personalizada basada en tu perfil y objetivos.

Además, si compartís imágenes de comidas que te gustan o que forman parte de tu rutina, Chef AI las incorpora como parte de tu historial dietético y las tiene en cuenta al sugerirte recetas y planes de comidas futuros. Por ejemplo, si mostrás una tostada de palta con huevo y pedís que la incluya en tu dieta, el asistente la recordará y podrá incorporarla en tu planificación semanal.',
    'features',
    6
  );
