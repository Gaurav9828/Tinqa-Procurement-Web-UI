import React from 'react';
import { DESCRIPTION_SECTIONS, isTemplated, parseDescription } from '../utils/productDescription';

/**
 * A description as the storefront lays it out: Overview as the lead, then each filled section under its heading,
 * Highlights as a list. A description written before the template shows as plain text.
 */
export const ProductDescriptionView: React.FC<{ description: string | null | undefined; className?: string }> = ({ description, className = '' }) => {
    if (!description?.trim()) return null;
    if (!isTemplated(description)) {
        return <p className={`whitespace-pre-wrap text-gray-600 dark:text-gray-300 leading-relaxed ${className}`}>{description}</p>;
    }
    const sections = parseDescription(description);
    return (
        <div className={`space-y-3 ${className}`}>
            {DESCRIPTION_SECTIONS.filter(({ key }) => sections[key]).map(({ key, heading, bullets }) => (
                <section key={key}>
                    {key !== 'overview' && (
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">{heading}</h4>
                    )}
                    {bullets ? (
                        <ul className="list-disc pl-5 space-y-0.5 text-gray-700 dark:text-gray-300">
                            {sections[key].split('\n').filter(Boolean).map((point, i) => <li key={i}>{point}</li>)}
                        </ul>
                    ) : (
                        <p className={`whitespace-pre-wrap leading-relaxed ${key === 'overview' ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>
                            {sections[key]}
                        </p>
                    )}
                </section>
            ))}
        </div>
    );
};
