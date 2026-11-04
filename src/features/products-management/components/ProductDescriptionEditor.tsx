import React, { useState } from 'react';
import { ExternalLink, Sparkles, Undo2 } from 'lucide-react';
import { CHOICE_TONE, SOLID_TONE } from '../../../components/ui/actionTones';
import { useDescriptionSuggestions } from '../hooks/useDescriptionSuggestions';
import { REFERENCE_SUBJECT_MAX, REFERENCE_SUBJECT_MIN, type DescriptionContext } from '../utils/descriptionSuggestions';
import {
    composeDescription,
    DESCRIPTION_MAX,
    DESCRIPTION_SECTIONS,
    isTemplated,
    parseDescription,
    type DescriptionSections,
} from '../utils/productDescription';
import { ProductDescriptionView } from './ProductDescriptionView';

interface ProductDescriptionEditorProps {
    /** The stored description text (template format, see utils/productDescription). */
    value: string;
    onChange: (value: string) => void;
    /** The product's other fields, used to write the suggestions. */
    context: DescriptionContext;
    disabled?: boolean;
    labelClassName?: string;
}

const INPUT = 'w-full px-3 py-2 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0071e3] text-black dark:text-white';

/**
 * The description, written in the template's six sections so every product reads alike on the storefront and Aura
 * can compare them. "Suggest descriptions" offers three versions to start from (see useDescriptionSuggestions).
 */
export const ProductDescriptionEditor: React.FC<ProductDescriptionEditorProps> = ({
    value,
    onChange,
    context,
    disabled,
    labelClassName = 'block font-medium text-gray-700 dark:text-gray-300',
}) => {
    const [sections, setSections] = useState<DescriptionSections>(() => parseDescription(value));
    // The text this editor last sent; any other value (form reset, a draft loaded) is parsed again (state adjusted
    // during render, not in an effect)
    const [emitted, setEmitted] = useState(value);
    if (value !== emitted) {
        setEmitted(value);
        setSections(parseDescription(value));
    }
    const [previous, setPrevious] = useState<DescriptionSections | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const [subject, setSubject] = useState('');
    const { suggestions, reference, loading, canLookUp, suggest } = useDescriptionSuggestions();

    const update = (next: DescriptionSections) => {
        const text = composeDescription(next);
        setSections(next);
        setEmitted(text);
        onChange(text);
    };

    const openPanel = () => {
        setPanelOpen(true);
        if (!subject) setSubject(context.title.trim());
    };

    const runSuggest = () => {
        if (!loading) void suggest(subject || context.title, context);
    };

    const apply = (next: DescriptionSections) => {
        setPrevious(sections);
        update(next);
    };

    const length = composeDescription(sections).length;
    const legacy = !!value.trim() && !isTemplated(value);
    const subjectTooShort = subject.trim().length < REFERENCE_SUBJECT_MIN;

    return (
        <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <label className={labelClassName}>Description</label>
                <div className="flex items-center gap-2">
                    {previous && (
                        <button
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                                update(previous);
                                setPrevious(null);
                            }}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${CHOICE_TONE.warning.idle}`}
                        >
                            <Undo2 className="w-3.5 h-3.5" /> Undo suggestion
                        </button>
                    )}
                    <button
                        type="button"
                        disabled={disabled}
                        onClick={panelOpen ? () => setPanelOpen(false) : openPanel}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium ${panelOpen ? CHOICE_TONE.primary.active : CHOICE_TONE.primary.idle}`}
                    >
                        <Sparkles className="w-3.5 h-3.5" /> Suggest descriptions
                    </button>
                </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
                Every product uses the same sections so the storefront looks consistent and Aura can compare products. Empty
                sections are left out.
            </p>
            {legacy && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                    This description was written before the template. It is in Overview now; move each part into its section.
                </p>
            )}

            {panelOpen && (
                <div className="rounded-xl border border-[#0071e3]/30 bg-[#0071e3]/[0.04] p-3 space-y-3" aria-label="Description suggestions">
                    <div className="flex flex-col sm:flex-row sm:items-end gap-2">
                        <div className="flex-1">
                            <label htmlFor="description-subject" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                                What does the miniature show?
                            </label>
                            <input
                                id="description-subject"
                                type="text"
                                value={subject}
                                maxLength={REFERENCE_SUBJECT_MAX}
                                onChange={(e) => setSubject(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        runSuggest();
                                    }
                                }}
                                placeholder="e.g. Kedarnath Temple"
                                className={INPUT}
                            />
                        </div>
                        <button
                            type="button"
                            disabled={disabled || loading || subjectTooShort}
                            onClick={runSuggest}
                            className={`px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 ${SOLID_TONE.primary}`}
                        >
                            {loading ? 'Looking up…' : 'Suggest'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        {canLookUp
                            ? 'Looks the subject up on Wikipedia (free, once per subject) and writes three versions from it and the name, tagline and specifications.'
                            : 'Writes three versions from the name, tagline and specifications.'}
                    </p>

                    {suggestions.length > 0 && (
                        <>
                            {reference ? (
                                <p className="text-xs text-gray-600 dark:text-gray-300">
                                    Facts from{' '}
                                    <a href={reference.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[#0071e3] hover:underline">
                                        {reference.source}: {reference.title} <ExternalLink className="w-3 h-3" />
                                    </a>
                                    . Check every claim against the product and rewrite in your own words before saving.
                                </p>
                            ) : (
                                <p className="text-xs text-gray-600 dark:text-gray-300">Built from the product's own details; write The Story yourself.</p>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                                {suggestions.map((suggestion) => (
                                    <div key={suggestion.style} className="flex flex-col rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-[#1c1c1e] p-3">
                                        <p className="font-semibold text-gray-900 dark:text-white">{suggestion.label}</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{suggestion.angle}</p>
                                        <ProductDescriptionView description={composeDescription(suggestion.sections)} className="flex-1 max-h-64 overflow-y-auto pr-1 text-xs" />
                                        <button
                                            type="button"
                                            disabled={disabled}
                                            onClick={() => apply(suggestion.sections)}
                                            className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-medium ${SOLID_TONE.primary}`}
                                        >
                                            Use the {suggestion.label} version
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="space-y-3">
                {DESCRIPTION_SECTIONS.map((section) => {
                    const text = sections[section.key];
                    const id = `description-${section.key}`;
                    return (
                        <div key={section.key}>
                            <div className="flex items-baseline justify-between gap-2">
                                <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">{section.heading}</label>
                                <span className={`text-[11px] ${text.length > section.guideChars ? 'text-amber-600' : 'text-gray-400'}`}>
                                    {text.length}/{section.guideChars}
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{section.hint}</p>
                            <textarea
                                id={id}
                                rows={section.key === 'story' ? 3 : 2}
                                value={text}
                                disabled={disabled}
                                onChange={(e) => update({ ...sections, [section.key]: e.target.value })}
                                placeholder={section.placeholder}
                                className={`${INPUT} resize-y`}
                            />
                        </div>
                    );
                })}
            </div>
            <p className={`text-right text-xs ${length > DESCRIPTION_MAX ? 'text-rose-600' : 'text-gray-400'}`}>
                {length}/{DESCRIPTION_MAX} characters in total{length > DESCRIPTION_MAX ? ': shorten it to save' : ''}
            </p>
        </div>
    );
};
