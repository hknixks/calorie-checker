import { Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_LABELS } from '../data/foods';
import { searchFoods } from '../lib/match';
import { useStore } from '../lib/store';
import type { Food } from '../lib/types';

interface Props {
  title: string;
  initialQuery?: string;
  onSelect: (food: Food) => void;
  onClose: () => void;
}

export default function FoodPicker({ title, initialQuery = '', onSelect, onClose }: Props) {
  const { foods } = useStore();
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const results = useMemo(() => searchFoods(query, foods), [query, foods]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <div className="modal-head-row">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X aria-hidden="true" />
            </button>
          </div>
          <div className="search">
            <Search className="search-icon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              placeholder="Search: jollof, eba, egusi, dodo, suya…"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="results">
          {results.length === 0 ? (
            <p className="empty">
              Nothing matches “{query}”. Try a shorter word, pick the closest food and adjust the
              grams, or create it yourself under Add → Custom.
            </p>
          ) : (
            results.map((food) => (
              <button key={food.id} className="result" onClick={() => onSelect(food)}>
                <span>
                  <span className="result-name">{food.name}</span>
                  <br />
                  <span className="result-cat">
                    {food.custom ? 'Your food' : CATEGORY_LABELS[food.category] ?? food.category}
                  </span>
                </span>
                <span className="result-kcal">{food.per100g.kcal} kcal/100g</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
