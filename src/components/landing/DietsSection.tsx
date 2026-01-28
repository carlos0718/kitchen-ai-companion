import { Utensils, Beef, Fish, Leaf, Apple, Dumbbell, Clock } from 'lucide-react';

const diets = [
  {
    icon: Utensils,
    name: 'Comida Casera',
    description: 'Equilibrada y familiar',
    color: 'bg-blue-500',
  },
  {
    icon: Beef,
    name: 'Keto',
    description: 'Baja en carbohidratos',
    color: 'bg-red-500',
  },
  {
    icon: Fish,
    name: 'Paleo',
    description: 'Alimentos no procesados',
    color: 'bg-orange-500',
  },
  {
    icon: Leaf,
    name: 'Vegetariana',
    description: 'Sin carne ni pescado',
    color: 'bg-green-500',
  },
  {
    icon: Apple,
    name: 'Vegana',
    description: 'Basada en plantas',
    color: 'bg-emerald-500',
  },
  {
    icon: Dumbbell,
    name: 'Deportista',
    description: 'Alta en proteínas',
    color: 'bg-purple-500',
  },
  {
    icon: Clock,
    name: 'Ayuno Intermitente',
    description: 'Ventanas de alimentación',
    color: 'bg-indigo-500',
  },
];

export function DietsSection() {
  return (
    <section className="py-20 px-4 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl font-serif font-bold text-foreground">
            Compatible con tu estilo de vida
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Chef AI se adapta a cualquier tipo de dieta. Recetas personalizadas según tus necesidades nutricionales.
          </p>
        </div>

        {/* Diets Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {diets.map((diet, index) => {
            const Icon = diet.icon;
            return (
              <div
                key={index}
                className="flex flex-col items-center p-4 bg-card rounded-xl border border-border hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className={`${diet.color} p-3 rounded-full text-white mb-3`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-semibold text-sm text-foreground text-center">
                  {diet.name}
                </h3>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {diet.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Bottom text */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          Y muchas más combinaciones personalizadas según tus restricciones y alergias
        </p>
      </div>
    </section>
  );
}
