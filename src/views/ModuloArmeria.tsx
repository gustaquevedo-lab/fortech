import { type FC, useState, useEffect } from 'react';
import {
    Package, ShieldCheck, Radio, Truck, Wrench, CheckCircle2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import TabArmeria from '../components/inventario/TabArmeria';
import TabEquipamiento from '../components/inventario/TabEquipamiento';
import TabFlota from '../components/inventario/TabFlota';

const ModuloInventario: FC = () => {
    const [activeTab, setActiveTab] = useState<'armeria' | 'equipamiento' | 'flota'>('armeria');
    const [stats, setStats] = useState({ weapons: 0, equipment: 0, vehicles: 0, maintenance: 0 });
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, [activeTab]);

    const fetchStats = async () => {
        setIsLoading(true);
        const [wRes, eRes, vRes] = await Promise.all([
            supabase.from('weapons').select('id, status'),
            supabase.from('equipment').select('id, status'),
            supabase.from('vehicles').select('id, status')
        ]);

        const weaponsList = wRes.data || [];
        const equipList = eRes.data || [];
        const vehicleList = vRes.data || [];

        const maintenanceCount = [
            ...weaponsList.filter(w => w.status === 'MAINTENANCE'),
            ...equipList.filter(e => e.status === 'MAINTENANCE'),
            ...vehicleList.filter(v => v.status === 'MAINTENANCE')
        ].length;

        setStats({
            weapons: weaponsList.length,
            equipment: equipList.length,
            vehicles: vehicleList.length,
            maintenance: maintenanceCount
        });
        setIsLoading(false);
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            {/* Header */}
            <header className="flex justify-between items-end mb-2">
                <div>
                    <h2 className="text-3xl font-bold text-white font-grotesk tracking-tight">Inventario y Flota</h2>
                    <p className="text-slate-400 mt-1">Armería, Equipamiento Operativo y Vehículos de Patrullaje</p>
                </div>
            </header>

            {/* KPI Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glassmorphism p-5 rounded-2xl flex items-center gap-4 border-primary/20">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                        <ShieldCheck size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white font-grotesk">{isLoading ? '-' : stats.weapons}</p>
                        <p className="text-slate-400 text-xs">Armas Registradas</p>
                    </div>
                </div>
                <div className="glassmorphism p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-violet-400">
                        <Radio size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white font-grotesk">{isLoading ? '-' : stats.equipment}</p>
                        <p className="text-slate-400 text-xs">Equipos Operativos</p>
                    </div>
                </div>
                <div className="glassmorphism p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/20 flex items-center justify-center text-sky-400">
                        <Truck size={24} />
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-white font-grotesk">{isLoading ? '-' : stats.vehicles}</p>
                        <p className="text-slate-400 text-xs">Vehículos</p>
                    </div>
                </div>
                <div className="glassmorphism p-5 rounded-2xl flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stats.maintenance > 0 ? 'bg-orange-500/20 text-orange-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                        {stats.maintenance > 0 ? <Wrench size={24} /> : <CheckCircle2 size={24} />}
                    </div>
                    <div>
                        <p className={`text-2xl font-bold font-grotesk ${stats.maintenance > 0 ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {isLoading ? '-' : stats.maintenance}
                        </p>
                        <p className="text-slate-400 text-xs">En Mantenimiento</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                    onClick={() => setActiveTab('armeria')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'armeria' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <ShieldCheck size={16} /> Armería
                </button>
                <button
                    onClick={() => setActiveTab('equipamiento')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'equipamiento' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Package size={16} /> Equipamiento
                </button>
                <button
                    onClick={() => setActiveTab('flota')}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'flota' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300 hover:bg-slate-800/50'}`}
                >
                    <Truck size={16} /> Flota Vehicular
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'armeria' && <TabArmeria />}
            {activeTab === 'equipamiento' && <TabEquipamiento />}
            {activeTab === 'flota' && <TabFlota />}
        </div>
    );
};

export default ModuloInventario;
