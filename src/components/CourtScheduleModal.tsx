'use client';

import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Court } from '@prisma/client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getCourtSchedules, saveCourtSchedules } from '@/actions/schedules';

const DAYS_OF_WEEK = [
    { id: 1, name: 'Lunes' },
    { id: 2, name: 'Martes' },
    { id: 3, name: 'Miércoles' },
    { id: 4, name: 'Jueves' },
    { id: 5, name: 'Viernes' },
    { id: 6, name: 'Sábado' },
    { id: 0, name: 'Domingo' },
];

interface CourtScheduleModalProps {
    court: Court;
}

interface DaySchedule {
    active: boolean;
    openTime: string;
    closeTime: string;
    slotDuration: number;
}

export default function CourtScheduleModal({ court }: CourtScheduleModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estado inicial vacío
    const [schedules, setSchedules] = useState<Record<number, DaySchedule>>(() => {
        const initial: Record<number, DaySchedule> = {};
        DAYS_OF_WEEK.forEach(day => {
            initial[day.id] = { active: false, openTime: '08:00', closeTime: '23:00', slotDuration: 90 };
        });
        return initial;
    });

    // Cargar datos reales cuando se abre el modal
    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            getCourtSchedules(court.id).then((res) => {
                if (res.success && res.data) {
                    const loadedSchedules = { ...schedules };
                    res.data.forEach((bh) => {
                        loadedSchedules[bh.dayOfWeek] = {
                            active: true,
                            openTime: bh.openTime,
                            closeTime: bh.closeTime,
                            slotDuration: bh.slotDuration,
                        };
                    });
                    setSchedules(loadedSchedules);
                }
                setLoading(false);
            });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, court.id]);

    const handleSave = async () => {
        setSaving(true);
        // Filtramos solo los días que el usuario marcó como activos
        const payload = Object.entries(schedules)
            .filter(([_, schedule]) => schedule.active)
            .map(([dayId, schedule]) => ({
                dayOfWeek: parseInt(dayId),
                openTime: schedule.openTime,
                closeTime: schedule.closeTime,
                slotDuration: schedule.slotDuration,
            }));

        const result = await saveCourtSchedules(court.id, payload);
        setSaving(false);

        if (result.success) {
            setIsOpen(false);
        } else {
            alert(result.error);
        }
    };

    const updateDay = (dayId: number, field: keyof DaySchedule, value: any) => {
        setSchedules(prev => ({
            ...prev,
            [dayId]: { ...prev[dayId], [field]: value }
        }));
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger render={<Button variant="outline" size="icon" title="Configurar Horarios" />}>
                    <Clock className="h-4 w-4 text-blue-600" />
            </DialogTrigger>

            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Horarios: {court.name}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 text-center text-slate-500">Cargando horarios...</div>
                ) : (
                    <div className="space-y-4 mt-4">
                        <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-slate-500 border-b pb-2">
                            <div className="col-span-3">Día</div>
                            <div className="col-span-3 text-center">Apertura</div>
                            <div className="col-span-3 text-center">Cierre</div>
                            <div className="col-span-3 text-center">Turno (min)</div>
                        </div>

                        {DAYS_OF_WEEK.map((day) => {
                            const current = schedules[day.id];
                            return (
                                <div key={day.id} className="grid grid-cols-12 gap-2 items-center py-2 border-b dark:border-slate-700 last:border-0">
                                    <div className="col-span-3 flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            checked={current.active}
                                            onChange={(e) => updateDay(day.id, 'active', e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                                        />
                                        <Label className={current.active ? 'text-slate-900 dark:text-slate-100' : 'text-slate-400'}>
                                            {day.name}
                                        </Label>
                                    </div>

                                    <div className="col-span-3">
                                        <Input
                                            type="time"
                                            value={current.openTime}
                                            disabled={!current.active}
                                            onChange={(e) => updateDay(day.id, 'openTime', e.target.value)}
                                            className="h-8"
                                        />
                                    </div>

                                    <div className="col-span-3">
                                        <Input
                                            type="time"
                                            value={current.closeTime}
                                            disabled={!current.active}
                                            onChange={(e) => updateDay(day.id, 'closeTime', e.target.value)}
                                            className="h-8"
                                        />
                                    </div>

                                    <div className="col-span-3">
                                        <Input
                                            type="number"
                                            step="30"
                                            min="30"
                                            value={current.slotDuration}
                                            disabled={!current.active}
                                            onChange={(e) => updateDay(day.id, 'slotDuration', parseInt(e.target.value) || 90)}
                                            className="h-8"
                                        />
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-4 flex justify-end space-x-2 border-t dark:border-slate-700 mt-6">
                            <Button type="button" variant="ghost" onClick={() => setIsOpen(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleSave} disabled={saving}>
                                {saving ? 'Guardando...' : 'Guardar Horarios'}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
