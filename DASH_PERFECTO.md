1. Problema del ranking actual

Hoy tu ranking es básicamente:

maxRisk
↓
alerts

Ejemplo:

Vehículo	Eventos	Riesgo
AG338XF	3	7
AF990OE	4	4

Pero esto puede ser engañoso:

vehículo A
3 excesos a 140 km/h

vehículo B
4 excesos a 85 km/h

El vehículo A es mucho más peligroso.

2. Índice de conducción riesgosa

Se calcula con tres factores:

velocidad
frecuencia
repetición del conductor

Ejemplo simple:

score =
   (maxSpeed - limite)
 + (eventos * 2)
 + (incidentes repetidos * 3)

Esto detecta conductores que:

exceden mucho
repiten conductas
3. Ejemplo real

Datos:

Vehículo A
3 eventos
maxSpeed 142

Vehículo B
5 eventos
maxSpeed 95

Resultado:

A → score 18
B → score 9

El ranking cambia.

4. Cómo mostrarlo en el dashboard

Tu card quedaría así:

Vehículos de conducción riesgosa

1 AG338XF   score 18
2 AF990OE   score 9
3 AF999DU   score 7

La barra puede representar score relativo.

5. Visual que funciona muy bien

Ejemplo:

AG338XF     3 excesos     ███████████  18
AF990OE     4 excesos     ███████      9
AF999DU     2 excesos     █████        7

Esto comunica riesgo mejor que solo eventos.

6. Mejora adicional usada en flotas grandes

Agregar indicador:

conductor reincidente

Si un conductor aparece en varios excesos:

⚠ conductor reincidente

Esto detecta problemas de capacitación.

7. Dónde calcularlo

Lo ideal:

dailyAlerts batch

porque ya tienes:

speedIncidents
maxSpeed
groupedEventsCount

Ahí se puede calcular:

drivingRiskScore

y guardarlo.

8. Ejemplo en tu documento dailyAlerts

Vehículo:

riskScore: 7
drivingRiskScore: 18

9. Qué datos ya tienes (muy importantes)

En DailyAlertVehicle ya existen campos que permiten hacer esto sin cambiar Firestore:

speedIncidents[]
maxSpeed
groupedEventsCount
durationSeconds
driverName
severity

y además:

summary.excesos
summary.no_identificados
summary.llave_sin_cargar

Esto permite calcular un score real de conducción.

10. Fórmula simple y efectiva

Una fórmula usada en sistemas de telemetría es ponderar:

frecuencia
intensidad
repetición

Ejemplo práctico:

drivingScore =
    excesos * 2
  + incidentes_unicos * 3
  + exceso_velocidad_grave * 5

Donde:

exceso_velocidad_grave = maxSpeed >= 120
11. Ejemplo real

Vehículo A:

excesos: 3
maxSpeed: 142
incidentes únicos: 2

score:

3*2 + 2*3 + 5 = 17

Vehículo B:

excesos: 5
maxSpeed: 92
incidentes únicos: 4

score:

5*2 + 4*3 = 22

Resultado:

B es peor conductor
aunque no tenga la mayor velocidad

Esto refleja comportamiento, no solo picos.

12. Mejora clave: detectar reincidencia

Si el mismo conductor aparece varias veces:

driverName repetido

se puede sumar:

+3

Esto detecta:

conductores problemáticos
13. Visual en el dashboard

Tu componente actual:

Vehículos de mayor riesgo

podría convertirse en:

Vehículos de conducción riesgosa

y mostrar:

1 AG338XF   3 excesos    ██████████  17
2 AF990OE   4 excesos    ███████     12
3 AF999DU   2 excesos    █████       9
14. Indicadores adicionales muy útiles

Debajo del ranking puedes mostrar:

exceso máximo

ejemplo:

AG338XF
142 km/h

o

reincidente

ejemplo:

⚠ conductor reincidente