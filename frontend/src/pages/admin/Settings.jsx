import { useState } from 'react';
import { 
  FiBriefcase, 
  FiMessageSquare, 
  FiCreditCard, 
  FiUsers, 
  FiSave,
  FiGlobe,
  FiLock,
  FiBell,
  FiSmartphone,
  FiPlus,
  FiZap,
  FiTrash2,
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';

const Settings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('business');

  const tabs = [
    { id: 'business', label: 'Business Profile', icon: FiBriefcase },
    { id: 'whatsapp', label: 'WhatsApp API', icon: FiMessageSquare },
    { id: 'subscription', label: 'Subscription', icon: FiCreditCard },
    { id: 'team', label: 'Team Members', icon: FiUsers },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'business':
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Entity Legal Name</label>
                <Input defaultValue={user?.businessName} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Industry Category</label>
                <Input defaultValue={user?.businessType} disabled />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Primary Domain</label>
                <Input placeholder="ematix.io/hub-1" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Support Email</label>
                <Input defaultValue={user?.email} />
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <Button className="!px-8">
                <FiSave className="mr-2" /> Save Configuration
              </Button>
            </div>
          </div>
        );
      case 'whatsapp':
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="p-6 rounded-3xl bg-blue-50 border border-blue-100 flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg">
                  <FiSmartphone className="h-6 w-6" />
                </div>
                <div>
                   <h4 className="text-sm font-black text-slate-900 uppercase">Status: Connected</h4>
                   <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mt-0.5">Meta Business API v18.0</p>
                </div>
                <Badge variant="processing" className="ml-auto">Active Node</Badge>
             </div>
             
             <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number ID</label>
                  <Input defaultValue="1092837465092" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WABA ID</label>
                  <Input defaultValue="9023847561029" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permanent Access Token</label>
                  <div className="relative">
                    <Input type="password" value="EAAGm0PX4ZCpsBAK0ZB0..." />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-blue-600 uppercase">Rotate</button>
                  </div>
                </div>
             </div>
          </div>
        );
      case 'subscription':
        return (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="!bg-slate-900 text-white border-none relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-4 opacity-10">
                      <FiZap className="h-16 w-16" />
                   </div>
                   <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Current Protocol</p>
                   <h3 className="text-2xl font-black italic">{user?.plan || 'Pro'} Edition</h3>
                   <p className="text-xs font-bold text-slate-400 mt-4 uppercase tracking-tighter">Billed Monthly: $49.00</p>
                   <button className="mt-6 w-full py-3 bg-white text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all">Change Plan</button>
                </Card>
                
                <Card className="md:col-span-2">
                   <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Resource Allocation</h4>
                   <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-end mb-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase">Messaging Volume</span>
                           <span className="text-xs font-black text-slate-900">8.4k / 10k</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                           <div className="h-full bg-blue-600 w-[84%] rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-2">
                           <span className="text-[10px] font-black text-slate-400 uppercase">Network Nodes (Staff)</span>
                           <span className="text-xs font-black text-slate-900">3 / 5</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                           <div className="h-full bg-indigo-600 w-[60%] rounded-full shadow-[0_0_8px_rgba(79,70,229,0.4)]" />
                        </div>
                      </div>
                   </div>
                </Card>
             </div>
          </div>
        );
      case 'team':
        return (
          <div className="space-y-6 animate-fade-in">
             <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest">Active Personnel</h4>
                <Button size="sm" className="!px-4">
                   <FiPlus className="mr-2" /> Authorize User
                </Button>
             </div>
             <div className="space-y-3">
                {[
                  { name: 'Arjun Mehta', role: 'System Admin', email: 'arjun@ematix.io' },
                  { name: 'Sarah Connor', role: 'Support Specialist', email: 'sarah@ematix.io' },
                  { name: 'John Doe', role: 'Logistics Analyst', email: 'john@ematix.io' },
                ].map((member, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl border border-slate-50 bg-white hover:bg-slate-50 transition-all group">
                     <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500">
                        {member.name.charAt(0)}
                     </div>
                     <div className="flex-1">
                        <p className="text-sm font-black text-slate-900 leading-none">{member.name}</p>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{member.email}</p>
                     </div>
                     <Badge variant={member.role.includes('Admin') ? 'processing' : 'default'}>{member.role}</Badge>
                     <button className="opacity-0 group-hover:opacity-100 h-8 w-8 rounded-lg hover:bg-rose-50 text-rose-500 flex items-center justify-center transition-all">
                        <FiTrash2 />
                     </button>
                  </div>
                ))}
             </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">System Configuration</h1>
        <p className="text-sm text-slate-500 font-bold mt-1">Manage global hub settings and security</p>
      </header>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-black transition-all duration-300 ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 translate-x-2' 
                : 'bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
          
          <div className="h-px bg-slate-100 my-4 mx-4" />
          
          <button className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-black text-slate-500 hover:bg-rose-50 hover:text-rose-600 transition-all">
            <FiLock className="h-4 w-4" /> Security Matrix
          </button>
          <button className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-sm font-black text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all">
            <FiBell className="h-4 w-4" /> Notify Hub
          </button>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          <Card className="min-h-[500px]">
             {renderContent()}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
