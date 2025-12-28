import { Brain, Calendar, Apple, Users, BookOpen, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Brain,
    title: 'IA Avanzada',
    description:
      'Tecnología de inteligencia artificial de última generación que entiende tus preferencias y necesidades nutricionales.',
  },
  {
    icon: Calendar,
    title: 'Planificador de Comidas',
    description:
      'Genera planes semanales completos con un solo clic. Organiza tus desayunos, almuerzos, cenas y snacks automáticamente.',
  },
  {
    icon: Apple,
    title: 'Nutrición Balanceada',
    description:
      'Todas las recetas incluyen información nutricional detallada: calorías, proteínas, carbohidratos, grasas y fibra.',
  },
  {
    icon: Users,
    title: 'Perfecto para Familias',
    description:
      'Ajusta automáticamente las porciones según el tamaño de tu hogar. Planifica comidas que toda la familia disfrutará.',
  },
  {
    icon: BookOpen,
    title: 'Recetas Personalizadas',
    description:
      'Respeta tus alergias, restricciones dietéticas y preferencias de cocina. Cada receta es única para ti.',
  },
  {
    icon: Settings,
    title: 'Modo Flexible',
    description:
      'Elige entre modo estricto o flexible. Reemplaza cualquier comida con alternativas generadas por IA instantáneamente.',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-serif font-bold text-foreground">
            Todo lo que necesitas
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chef AI combina tecnología avanzada con simplicidad para hacer tu vida en la cocina más fácil y saludable.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="border border-border bg-card hover:bg-accent/5 transition-all duration-300 hover:shadow-lg group"
              >
                <CardContent className="p-6 space-y-4">
                  {/* Icon */}
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>

                  {/* Title */}
                  <h3 className="text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
