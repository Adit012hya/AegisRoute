import { useState } from "react";
import { motion } from "motion/react";
import { X, Plus, Trash2, User, Shield } from "lucide-react";

export interface EmergencyContact {
    id: string;
    name: string;
    number: string;
    icon: any;
    color: string;
    isPrimary?: boolean;
}

interface SettingsModalProps {
    onClose: () => void;
    contacts: EmergencyContact[];
    onUpdateContacts: (contacts: EmergencyContact[]) => void;
}

export function SettingsModal({ onClose, contacts, onUpdateContacts }: SettingsModalProps) {
    const [newContact, setNewContact] = useState({ name: "", number: "" });

    const handleAddContact = () => {
        if (!newContact.name || !newContact.number) return;
        const contact: EmergencyContact = {
            id: Math.random().toString(36).substr(2, 9),
            name: newContact.name,
            number: newContact.number,
            icon: User,
            color: "#3b82f6",
        };
        onUpdateContacts([...contacts, contact]);
        setNewContact({ name: "", number: "" });
    };

    const handleDeleteContact = (id: string) => {
        onUpdateContacts(contacts.filter((c) => c.id !== id));
    };

    const handleUpdatePrimary = (number: string) => {
        const updated = contacts.map(c => {
            if (c.isPrimary) return { ...c, number };
            return c;
        });
        onUpdateContacts(updated);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative z-10 w-full max-w-md rounded-2xl border border-slate-800 shadow-2xl overflow-hidden bg-slate-900"
            >
                <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="size-5 text-emerald-500" />
                        <h2 className="text-xl font-bold text-white">Settings</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Primary Contact Edit */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Primary Emergency Number</label>
                        {contacts.map(contact => contact.isPrimary && (
                            <div key={contact.id} className="flex gap-2">
                                <input
                                    type="text"
                                    value={contact.number}
                                    onChange={(e) => handleUpdatePrimary(e.target.value)}
                                    placeholder="Primary Number"
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white outline-none focus:border-emerald-500 transition-colors"
                                />
                            </div>
                        ))}
                    </div>

                    <div className="h-px bg-slate-800" />

                    {/* Secondary Contacts */}
                    <div className="space-y-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Secondary Contacts</label>

                        <div className="space-y-2">
                            {contacts.filter(c => !c.isPrimary).map((contact) => (
                                <div key={contact.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 border border-slate-700">
                                    <div>
                                        <div className="font-semibold text-white text-sm">{contact.name}</div>
                                        <div className="text-xs text-slate-400">{contact.number}</div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteContact(contact.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Add New Contact */}
                        <div className="space-y-2 pt-2">
                            <input
                                type="text"
                                placeholder="Name"
                                value={newContact.name}
                                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none"
                            />
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Phone Number"
                                    value={newContact.number}
                                    onChange={(e) => setNewContact({ ...newContact, number: e.target.value })}
                                    className="flex-1 px-4 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm outline-none"
                                />
                                <button
                                    onClick={handleAddContact}
                                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors flex items-center gap-2"
                                >
                                    <Plus className="size-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
