import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { X, Phone, MessageSquare, AlertTriangle, MapPin, Share2, MessageCircle } from "lucide-react";

import { EmergencyContact } from "./SettingsModal";

interface EmergencyModalProps {
  onClose: () => void;
  contacts: EmergencyContact[];
}

export function EmergencyModal({ onClose, contacts }: EmergencyModalProps) {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const primaryContact = contacts.find(c => c.isPrimary) || contacts[0];

  const getEmergencyMessage = () => {
    if (!coords) return "I need help! Please check on me.";
    return `I need help! My live location: https://www.google.com/maps?q=${coords.lat},${coords.lng}`;
  };

  const handleCallEmergency = () => {
    if (primaryContact) {
      window.location.href = `tel:${primaryContact.number.replace(/\s+/g, '')}`;
    }
  };

  const sendWhatsApp = (number: string) => {
    const cleanNumber = number.replace(/\D/g, '');
    const message = encodeURIComponent(getEmergencyMessage());
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  const sendSMS = (number: string) => {
    const message = encodeURIComponent(getEmergencyMessage());
    window.location.href = `sms:${number}?body=${message}`;
  };

  const handleShareLiveLocation = () => {
    if (primaryContact) {
      // Default to WhatsApp for primary contact if available, or just use navigator.share
      if (navigator.share) {
        navigator.share({
          title: 'Emergency Location',
          text: getEmergencyMessage(),
        }).catch(() => {
          sendWhatsApp(primaryContact.number);
        });
      } else {
        sendWhatsApp(primaryContact.number);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="relative z-10 w-full max-w-md rounded-2xl border border-red-900/40 shadow-2xl overflow-hidden bg-slate-900"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-800">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-full flex items-center justify-center bg-red-600">
                <AlertTriangle className="size-6 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Emergency</h2>
                <p className="text-sm text-red-400 font-medium">Help is available</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="size-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Coordinates Display */}
          <div className="rounded-xl p-4 bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-2 mb-2 text-slate-400">
              <MapPin className="size-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Current Location</span>
            </div>
            {coords ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Latitude</div>
                  <div className="text-lg font-mono text-emerald-400 tabular-nums">{coords.lat.toFixed(6)}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Longitude</div>
                  <div className="text-lg font-mono text-emerald-400 tabular-nums">{coords.lng.toFixed(6)}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-500 animate-pulse italic">Fetching coordinates...</div>
            )}
          </div>

          {/* Call Emergency Button */}
          <button
            onClick={handleCallEmergency}
            className="w-full py-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg shadow-lg flex items-center justify-center gap-3 transition-colors"
          >
            <Phone className="size-6" />
            Call Primary Contact
          </button>

          {/* Quick Share Button */}
          <button
            onClick={handleShareLiveLocation}
            className="w-full py-4 rounded-xl border border-blue-900/40 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 font-bold text-lg flex items-center justify-center gap-3 transition-colors"
          >
            <Share2 className="size-6" />
            Share Live Location
          </button>

          {/* Emergency Contacts List */}
          <div className="space-y-3 pt-2">
            <div className="text-[10px] text-slate-500 uppercase font-bold px-1 mb-2">Send Updates to Contacts</div>
            {contacts.map((contact, index) => {
              const Icon = contact.icon;
              return (
                <div
                  key={index}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-800 bg-slate-800/30 group"
                >
                  <div
                    className="size-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: contact.color }}
                  >
                    <Icon className="size-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-white truncate">{contact.name}</div>
                    <div className="text-xs text-slate-500 truncate">{contact.number}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sendWhatsApp(contact.number)}
                      className="size-9 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-500 hover:text-white flex items-center justify-center transition-all"
                      title="Share via WhatsApp"
                    >
                      <MessageCircle className="size-5" />
                    </button>
                    <button
                      onClick={() => sendSMS(contact.number)}
                      className="size-9 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white flex items-center justify-center transition-all"
                      title="Share via SMS"
                    >
                      <MessageSquare className="size-5" />
                    </button>
                    <a
                      href={`tel:${contact.number}`}
                      className="size-9 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all"
                      title="Call"
                    >
                      <Phone className="size-4" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/50">
          <p className="text-[10px] text-center text-slate-500 leading-relaxed font-medium">
            Location links will be sent as Google Maps URLs. Ensure GPS is enabled for accuracy.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
