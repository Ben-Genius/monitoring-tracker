import { AuthInput, Field } from '@/features/auth/components/AuthLayout';

/**
 * The organisation fields shared by the sign-up and welcome pages. Most
 * organisations are one business, so there is one name: the first company is
 * created with the same name. Groups add their other companies in Settings.
 */
export function SetupFields({ orgName, withSample, onOrgName, onWithSample }: {
    orgName: string;
    withSample: boolean;
    onOrgName: (v: string) => void;
    onWithSample: (v: boolean) => void;
}) {
    return (
        <>
            <Field id="org-name" label="Organisation name" hint="Your business or team, e.g. Inspiration Pit Studios. Run more than one business? Add the others in Settings once you’re in.">
                <AuthInput id="org-name" name="organization" autoComplete="organization" value={orgName}
                    onChange={(e) => onOrgName(e.target.value)} maxLength={120} required aria-describedby="org-name-hint" />
            </Field>
            <label htmlFor="with-sample" className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3.5 text-[14px] transition-colors hover:bg-neutral-50 dark:border-[#1F1F1F] dark:hover:bg-[#111]">
                <input id="with-sample" name="with-sample" type="checkbox" checked={withSample}
                    onChange={(e) => onWithSample(e.target.checked)} className="mt-0.5 h-4 w-4 accent-neutral-950 dark:accent-white" />
                <span>
                    <span className="block font-medium">Add a sample project</span>
                    <span className="block text-neutral-500 dark:text-neutral-400">See every view with real-looking work straight away. Remove it in one click when you’re ready.</span>
                </span>
            </label>
        </>
    );
}
