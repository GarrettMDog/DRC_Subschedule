import { useRef, useState } from 'react';
import { Input } from '@fluentui/react-components';

const API_KEY = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;

/**
 * Address field with live suggestions from Google's Places Autocomplete
 * (New) REST API. Deliberately built as a custom fetch() call with our own
 * dropdown UI, rather than Google's own Autocomplete web components —
 * those (PlaceAutocompleteElement) are still genuinely rough around the
 * edges as of when this was built (alpha/beta release channel, reported
 * constructor issues), and this way the dropdown matches the rest of the
 * app's look rather than an unstyled foreign widget.
 *
 * Only ever calls the Autocomplete endpoint itself, never Place Details —
 * the prediction's own text is all that's needed here (just the address
 * string, not lat/long or business details), which keeps this about as
 * cheap as this API gets and avoids session-token bookkeeping entirely.
 *
 * If VITE_GOOGLE_PLACES_API_KEY isn't set, this quietly behaves as a plain
 * text input — no broken suggestions, no console spam, just no autocomplete
 * until a key exists.
 */
export default function AddressAutocomplete({ value, onChange, ...inputProps }) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef(null);

  async function fetchSuggestions(input) {
    if (!API_KEY || !input || input.trim().length < MIN_CHARS) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
        method: 'POST',
        // Explicit, not left to the browser default — this is what makes
        // the referrer-restricted API key resolve correctly regardless of
        // how deeply nested in iframes the page is (e.g. running inside a
        // Teams tab), same reasoning as the map link's approach.
        referrerPolicy: 'strict-origin-when-cross-origin',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask': 'suggestions.placePrediction.text,suggestions.placePrediction.placeId'
        },
        body: JSON.stringify({ input })
      });
      if (!res.ok) {
        setSuggestions([]);
        return;
      }
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } catch {
      // Autocomplete is a convenience, not a required function — if the
      // request fails for any reason, just fall back to a plain text
      // field rather than surface an error for something this minor.
      setSuggestions([]);
    }
  }

  function handleChange(e) {
    const newValue = e.target.value;
    onChange(newValue);
    setShowSuggestions(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(newValue), DEBOUNCE_MS);
  }

  function handleSelect(suggestion) {
    const text = suggestion.placePrediction?.text?.text || '';
    onChange(text);
    setSuggestions([]);
    setShowSuggestions(false);
  }

  return (
    <div style={{ position: 'relative' }}>
      <Input
        {...inputProps}
        value={value}
        onChange={handleChange}
        // A short delay, not an immediate hide — onMouseDown on a
        // suggestion fires before this blur does, so a plain onClick
        // there would never register (the dropdown would already be gone
        // by the time the click completes).
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 10,
            background: 'var(--colorNeutralBackground1)',
            border: '1px solid var(--colorNeutralStroke1)',
            borderRadius: 4,
            marginTop: 4,
            maxHeight: 240,
            overflowY: 'auto',
            boxShadow: 'var(--shadow8)'
          }}
        >
          {suggestions.map((s, i) => (
            <div
              key={s.placePrediction?.placeId || i}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 14 }}
              onMouseDown={() => handleSelect(s)}
            >
              {s.placePrediction?.text?.text || ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
