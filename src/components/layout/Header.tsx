import { useState } from 'react';
import { Bell, Search, Building2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

const companies = [
    { id: '1', name: 'Macwest', color: 'macwest' },
    { id: '2', name: 'Cypress', color: 'cypress' },
    { id: '3', name: 'Northbrook', color: 'northbrook' },
];

export default function Header() {
    const [selectedCompany, setSelectedCompany] = useState(companies[0]);

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
            {/* Company Selector */}
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Building2 className="h-5 w-5 text-gray-500" />
                    <select
                        value={selectedCompany.id}
                        onChange={(e) => {
                            const company = companies.find((c) => c.id === e.target.value);
                            if (company) setSelectedCompany(company);
                        }}
                        className="border-none bg-transparent text-lg font-semibold focus:outline-none focus:ring-0"
                    >
                        {companies.map((company) => (
                            <option key={company.id} value={company.id}>
                                {company.name}
                            </option>
                        ))}
                    </select>
                </div>
                <Badge variant={selectedCompany.color as any}>
                    {selectedCompany.name}
                </Badge>
            </div>

            {/* Search and Actions */}
            <div className="flex items-center space-x-4">
                {/* Search */}
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        type="search"
                        placeholder="Search tasks, projects..."
                        className="pl-10"
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-md hover:bg-gray-100">
                    <Bell className="h-5 w-5 text-gray-600" />
                    <span className="absolute top-1 right-1 h-2 w-2 bg-error rounded-full"></span>
                </button>
            </div>
        </header>
    );
}
