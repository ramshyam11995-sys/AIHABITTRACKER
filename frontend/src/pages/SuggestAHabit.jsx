import { useState } from "react";
import { Sparkles } from "lucide-react";
import HabitSuggestionModal from "../components/HabitSuggestionModal.jsx";
import api from "../api/axios.js";

export default function SuggestAHabit() {
  const [suggestOpen, setSuggestOpen] = useState(true);

  const acceptSuggestion = async (s) => {
    await api.post("/habits", {
      name: s.name,
      description: s.description,
      category: s.category,
      frequency: s.frequency,
      icon: s.icon,
      targetDays: s.frequency === "daily" ? 7 : 3,
    });

    setSuggestOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Sparkles size={20} />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Suggest a habit
            </h1>

            <p className="text-sm text-muted mt-0.5">
              Let AI suggest a habit personalized for you.
            </p>
          </div>
        </div>
      </div>

      <HabitSuggestionModal
        open={suggestOpen}
        onClose={() => setSuggestOpen(false)}
        onAccept={acceptSuggestion}
      />
    </div>
  );
}