import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Utensils,
  Fish,
  Leaf,
  Beef,
  Dumbbell,
  Apple,
  Info,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";

const DietGuide = () => {
  const diets = [
    {
      id: 'casera_normal',
      name: 'Comida Casera Normal',
      icon: Utensils,
      color: 'bg-blue-500',
      description: 'Alimentación equilibrada y familiar sin restricciones especiales',
      macros: { protein: 25, carbs: 45, fat: 30 },
      benefits: [
        'Alimentación variada y flexible',
        'Fácil de seguir a largo plazo',
        'Incluye todos los grupos alimenticios',
        'Ideal para toda la familia',
        'Sin restricciones complejas'
      ],
      considerations: [
        'Requiere equilibrio consciente',
        'Puede necesitar ajustes según objetivos específicos'
      ],
      idealFor: [
        'Personas sin restricciones médicas',
        'Familias buscando comida saludable',
        'Mantenimiento de peso saludable',
        'Estilo de vida activo general'
      ],
      mealDistribution: {
        '3meals': 'Desayuno 25% | Almuerzo 40% | Cena 35%',
        '4meals': 'Desayuno 25% | Snack AM 10% | Almuerzo 35% | Cena 30%',
        '5meals': 'Desayuno 20% | Snack AM 10% | Almuerzo 35% | Merienda 10% | Cena 25%'
      }
    },
    {
      id: 'keto',
      name: 'Dieta Keto',
      icon: Beef,
      color: 'bg-red-500',
      description: 'Dieta baja en carbohidratos y alta en grasas saludables para inducir cetosis',
      macros: { protein: 20, carbs: 10, fat: 70 },
      benefits: [
        'Pérdida de peso efectiva',
        'Reducción del apetito',
        'Mejora en niveles de energía',
        'Control de azúcar en sangre',
        'Claridad mental'
      ],
      considerations: [
        'Período de adaptación de 1-2 semanas',
        'Puede causar "keto flu" inicial',
        'Requiere planificación cuidadosa',
        'No recomendada sin supervisión médica'
      ],
      idealFor: [
        'Pérdida de peso rápida',
        'Control de diabetes tipo 2',
        'Epilepsia (con supervisión)',
        'Personas con resistencia a la insulina'
      ],
      mealDistribution: {
        '3meals': 'Enfoque en grasas saludables (aguacate, nueces, aceite de oliva)',
        '4meals': 'Snack alto en grasas (nueces, queso)',
        '5meals': 'Distribuir grasas equitativamente, proteína moderada'
      }
    },
    {
      id: 'paleo',
      name: 'Dieta Paleo',
      icon: Fish,
      color: 'bg-orange-500',
      description: 'Basada en alimentos no procesados, imitando la dieta ancestral',
      macros: { protein: 30, carbs: 35, fat: 35 },
      benefits: [
        'Elimina alimentos procesados',
        'Rica en nutrientes',
        'Reduce inflamación',
        'Mejora digestión',
        'Apoya masa muscular magra'
      ],
      considerations: [
        'Excluye lácteos y legumbres',
        'Puede ser costosa',
        'Requiere preparación de alimentos',
        'Socialmente restrictiva'
      ],
      idealFor: [
        'Personas con sensibilidad a lácteos',
        'Reducción de inflamación',
        'Atletas de resistencia',
        'Quienes buscan alimentos naturales'
      ],
      mealDistribution: {
        '3meals': 'Proteína animal + vegetales + frutas en cada comida',
        '4meals': 'Snack de frutas y nueces',
        '5meals': 'Distribuir proteína en todas las comidas'
      }
    },
    {
      id: 'vegetariano',
      name: 'Dieta Vegetariana',
      icon: Leaf,
      color: 'bg-green-500',
      description: 'Sin carne ni pescado, incluye lácteos y huevos',
      macros: { protein: 20, carbs: 50, fat: 30 },
      benefits: [
        'Rica en fibra y antioxidantes',
        'Reduce riesgo cardiovascular',
        'Ambientalmente sostenible',
        'Económica',
        'Variada y sabrosa'
      ],
      considerations: [
        'Requiere planificación para proteína completa',
        'Suplemento de B12 recomendado',
        'Vigilar hierro y zinc',
        'Combinar fuentes proteicas vegetales'
      ],
      idealFor: [
        'Razones éticas o ambientales',
        'Salud cardiovascular',
        'Control de peso',
        'Personas con digestión sensible'
      ],
      mealDistribution: {
        '3meals': 'Legumbres, huevos, lácteos distribuidos',
        '4meals': 'Snack con yogurt o queso',
        '5meals': 'Combinar cereales + legumbres para proteína completa'
      }
    },
    {
      id: 'vegano',
      name: 'Dieta Vegana',
      icon: Apple,
      color: 'bg-emerald-500',
      description: 'Basada en plantas, sin productos de origen animal',
      macros: { protein: 20, carbs: 50, fat: 30 },
      benefits: [
        'Muy rica en antioxidantes',
        'Baja en grasas saturadas',
        'Alto contenido de fibra',
        'Ambientalmente sostenible',
        'Reduce riesgo de enfermedades crónicas'
      ],
      considerations: [
        'Requiere suplementación (B12, D, Omega-3)',
        'Planificación nutricional esencial',
        'Combinar proteínas vegetales',
        'Vigilar calcio y hierro'
      ],
      idealFor: [
        'Razones éticas o ambientales',
        'Personas con colesterol alto',
        'Prevención de enfermedades',
        'Atletas (con planificación)'
      ],
      mealDistribution: {
        '3meals': 'Legumbres + cereales integrales + semillas/nueces',
        '4meals': 'Snack con hummus, frutas, frutos secos',
        '5meals': 'Distribución variada de fuentes proteicas vegetales'
      }
    },
    {
      id: 'deportista',
      name: 'Deportista / Alta Proteína',
      icon: Dumbbell,
      color: 'bg-purple-500',
      description: 'Optimizada para rendimiento físico y desarrollo muscular',
      macros: { protein: 30, carbs: 45, fat: 25 },
      benefits: [
        'Desarrollo de masa muscular',
        'Recuperación rápida',
        'Energía sostenida',
        'Mejora rendimiento deportivo',
        'Saciedad prolongada'
      ],
      considerations: [
        'Requiere entrenamiento regular',
        'Hidratación constante',
        'Timing de nutrientes importante',
        'No necesaria sin ejercicio intenso'
      ],
      idealFor: [
        'Atletas y deportistas',
        'Entrenamiento de fuerza',
        'Construcción muscular',
        'Deportes de resistencia'
      ],
      mealDistribution: {
        '3meals': 'Proteína en cada comida (carnes magras, pescado, huevos)',
        '4meals': 'Snack post-entreno con proteína + carbos',
        '5meals': 'Distribuir 1.6-2.2g proteína/kg peso corporal'
      }
    },
    {
      id: 'ayuno_intermitente',
      name: 'Ayuno Intermitente',
      icon: Clock,
      color: 'bg-indigo-500',
      description: 'Patrón alimentario que alterna períodos de ayuno con ventanas de alimentación',
      macros: { protein: 25, carbs: 40, fat: 35 },
      benefits: [
        'Pérdida de grasa corporal',
        'Mejora sensibilidad a la insulina',
        'Autofagia celular (regeneración)',
        'Simplifica la planificación de comidas',
        'Mejora claridad mental',
        'Reduce inflamación sistémica'
      ],
      considerations: [
        'No recomendado para embarazadas o lactantes',
        'Puede causar irritabilidad inicial',
        'Requiere hidratación constante',
        'No apto para personas con historial de trastornos alimentarios',
        'Consultar médico si tienes diabetes'
      ],
      idealFor: [
        'Pérdida de peso sostenible',
        'Personas con agenda ocupada',
        'Mejora de marcadores metabólicos',
        'Quienes buscan simplicidad alimentaria',
        'Control de resistencia a insulina'
      ],
      mealDistribution: {
        '3meals': 'Protocolo 16:8 - Ayuno 16h, comer en ventana de 8h (ej: 12pm-8pm)',
        '4meals': 'Protocolo 14:10 - Ayuno 14h, ventana de 10h con snack',
        '5meals': 'Protocolo 12:12 - Ayuno 12h nocturno, comidas distribuidas en 12h'
      },
      protocols: [
        { name: '16:8', description: 'Ayuno 16 horas, alimentación en 8 horas. El más popular y sostenible.' },
        { name: '14:10', description: 'Ayuno 14 horas, alimentación en 10 horas. Ideal para principiantes.' },
        { name: '5:2', description: '5 días normales, 2 días con 500-600 calorías.' },
        { name: 'OMAD', description: 'Una comida al día. Avanzado, no recomendado sin supervisión.' }
      ]
    }
  ];

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8 pl-12 md:pl-0">
        <h1 className="text-4xl font-bold mb-3">Guía de Tipos de Dieta</h1>
        <p className="text-lg text-muted-foreground">
          Conoce las características, beneficios y consideraciones de cada tipo de alimentación
        </p>
      </div>

      <Card className="mb-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-blue-900">Distribución Calórica por Comidas</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-blue-800">
          <div className="space-y-3">
            <div>
              <p className="font-semibold">3 Comidas al día:</p>
              <p className="text-sm">Desayuno 25% • Almuerzo 40% • Cena 35%</p>
            </div>
            <div>
              <p className="font-semibold">4 Comidas al día:</p>
              <p className="text-sm">Desayuno 25% • Snack AM 10% • Almuerzo 35% • Cena 30%</p>
            </div>
            <div>
              <p className="font-semibold">5 Comidas al día:</p>
              <p className="text-sm">Desayuno 20% • Snack AM 10% • Almuerzo 35% • Merienda 10% • Cena 25%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6">
        {diets.map((diet) => {
          const Icon = diet.icon;
          return (
            <Card key={diet.id} className="overflow-hidden">
              <CardHeader className="pb-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`${diet.color} p-3 rounded-lg text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{diet.name}</CardTitle>
                      <CardDescription className="text-[0.9rem] mt-1">
                        {diet.description}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="font-medium">
                      Proteína: {diet.macros.protein}%
                    </Badge>
                    <Badge variant="secondary" className="font-medium">
                      Carbos: {diet.macros.carbs}%
                    </Badge>
                    <Badge variant="secondary" className="font-medium">
                      Grasas: {diet.macros.fat}%
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Benefits */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    Beneficios
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {diet.benefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 mt-0.5">•</span>
                        <span>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Considerations */}
                <div>
                  <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-amber-600" />
                    Consideraciones
                  </h3>
                  <ul className="space-y-2">
                    {diet.considerations.map((consideration, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-amber-600 mt-0.5">•</span>
                        <span>{consideration}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Ideal For */}
                <div>
                  <h3 className="font-semibold text-lg mb-3">Ideal para</h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {diet.idealFor.map((ideal, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-blue-600 mt-0.5">→</span>
                        <span>{ideal}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Separator />

                {/* Meal Distribution */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">
                    {diet.id === 'ayuno_intermitente' ? 'Ventanas de Alimentación' : 'Distribución de Comidas'}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {Object.entries(diet.mealDistribution).map(([key, value]) => (
                      <div key={key}>
                        <span className="font-medium">
                          {key === '3meals' ? '3 comidas: ' : key === '4meals' ? '4 comidas: ' : '5 comidas: '}
                        </span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Protocols section for Intermittent Fasting */}
                {'protocols' in diet && diet.protocols && (
                  <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                    <h3 className="font-semibold text-lg mb-3 text-indigo-900">
                      Protocolos de Ayuno Intermitente
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(diet.protocols as Array<{name: string; description: string}>).map((protocol, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-md border border-indigo-100">
                          <span className="font-bold text-indigo-700">{protocol.name}</span>
                          <p className="text-sm text-gray-600 mt-1">{protocol.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-8 border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900 flex items-center gap-2">
            <Info className="h-5 w-5" />
            Importante
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-800 space-y-2">
          <p>
            Esta información es educativa y no sustituye el consejo médico o nutricional profesional.
          </p>
          <p>
            Antes de hacer cambios significativos en tu dieta, especialmente si tienes condiciones médicas,
            consulta con un profesional de la salud o nutricionista certificado.
          </p>
          <p className="font-semibold">
            La distribución de macronutrientes y calorías se calcula automáticamente según tu tipo de dieta
            y preferencia de comidas durante el proceso de onboarding.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DietGuide;
