import { Input } from '@/components/ui/input';

/** The organisation fields shared by the sign-up and welcome pages. */
export function SetupFields({ orgName, companyName, withSample, onOrgName, onCompanyName, onWithSample }: {
    orgName: string;
    companyName: string;
    withSample: boolean;
    onOrgName: (v: string) => void;
    onCompanyName: (v: string) => void;
    onWithSample: (v: boolean) => void;
}) {
    return (
        <>
            <div className="space-y-2">
                <label htmlFor="org-name" className="text-sm font-medium text-gray-700 dark:text-slate-300">Organisation</label>
                <p id="org-name-hint" className="text-xs text-gray-500 dark:text-slate-400">Your group or holding company, e.g. Asante Holdings.</p>
                <Input id="org-name" name="organization" autoComplete="organization" value={orgName}
                    onChange={(e) => onOrgName(e.target.value)} maxLength={120} required aria-describedby="org-name-hint" />
            </div>
            <div className="space-y-2">
                <label htmlFor="company-name" className="text-sm font-medium text-gray-700 dark:text-slate-300">First company</label>
                <p id="company-name-hint" className="text-xs text-gray-500 dark:text-slate-400">One of the businesses you run. You can add more later.</p>
                <Input id="company-name" name="company" autoComplete="off" value={companyName}
                    onChange={(e) => onCompanyName(e.target.value)} maxLength={120} required aria-describedby="company-name-hint" />
            </div>
            <label htmlFor="with-sample" className="flex items-start gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-slate-700">
                <input id="with-sample" name="with-sample" type="checkbox" checked={withSample}
                    onChange={(e) => onWithSample(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#F58220]" />
                <span>
                    <span className="block font-medium text-gray-800 dark:text-slate-200">Add a sample project</span>
                    <span className="block text-gray-500 dark:text-slate-400">See a full morning brief straight away. Remove it in one click when you’re ready.</span>
                </span>
            </label>
        </>
    );
}
