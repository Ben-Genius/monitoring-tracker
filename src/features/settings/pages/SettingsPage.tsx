import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Save, Bell, Shield, Database } from 'lucide-react';


export default function SettingsPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500 mt-1">
                    Manage system configuration and preferences
                </p>
            </div>

            {/* Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Shield className="h-5 w-5 text-primary" />
                            <CardTitle>General Settings</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Company Name</label>
                            <Input defaultValue="Macwest" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Time Zone</label>
                            <select className="w-full h-10 px-3 rounded-md border border-input bg-background">
                                <option>UTC-5 (Eastern Time)</option>
                                <option>UTC-6 (Central Time)</option>
                                <option>UTC-7 (Mountain Time)</option>
                                <option>UTC-8 (Pacific Time)</option>
                            </select>
                        </div>
                        <Button>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </CardContent>
                </Card>

                {/* Notification Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Bell className="h-5 w-5 text-primary" />
                            <CardTitle>Notifications</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Idle Task Alerts</p>
                                <p className="text-sm text-gray-500">
                                    Notify when tasks are idle for 48+ hours
                                </p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Project Profitability Alerts</p>
                                <p className="text-sm text-gray-500">
                                    Alert when profit margin drops below 5%
                                </p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Task Assignments</p>
                                <p className="text-sm text-gray-500">
                                    Notify when assigned new tasks
                                </p>
                            </div>
                            <input type="checkbox" defaultChecked className="h-4 w-4" />
                        </div>
                        <Button>
                            <Save className="h-4 w-4 mr-2" />
                            Save Preferences
                        </Button>
                    </CardContent>
                </Card>

                {/* Database Settings */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center space-x-2">
                            <Database className="h-5 w-5 text-primary" />
                            <CardTitle>Database</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Connection Status</p>
                                <p className="text-sm text-gray-500">Supabase PostgreSQL</p>
                            </div>
                            <Badge variant="success">Connected</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Last Backup</p>
                                <p className="text-sm text-gray-500">2026-01-30 00:00 UTC</p>
                            </div>
                            <Button variant="outline" size="sm">
                                Backup Now
                            </Button>
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium">Storage Used</p>
                                <p className="text-sm text-gray-500">245 MB / 500 MB</p>
                            </div>
                            <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-primary h-2 rounded-full"
                                    style={{ width: '49%' }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Company Management */}
                <Card>
                    <CardHeader>
                        <CardTitle>Company Management</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <p className="text-sm font-medium">Active Companies</p>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 border rounded-md">
                                    <span>Macwest</span>
                                    <Badge variant="macwest">Active</Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 border rounded-md">
                                    <span>Cypress</span>
                                    <Badge variant="cypress">Active</Badge>
                                </div>
                                <div className="flex items-center justify-between p-2 border rounded-md">
                                    <span>Northbrook</span>
                                    <Badge variant="northbrook">Active</Badge>
                                </div>
                            </div>
                        </div>
                        <Button variant="outline" className="w-full">
                            Add Company
                        </Button>
                    </CardContent>
                </Card>


            </div>
        </div>
    );
}
