import { useState, useEffect } from 'react';
import { CheckCircle, MapPin, Clock, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface ResolvedIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  location_name: string;
  created_at: string;
  resolved_at: string;
  image_url?: string;
  resolution_comment?: string;
  resolution_image_url?: string;
}

const ResolvedIssuesBrowser = () => {
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<ResolvedIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { toast } = useToast();

  const fetchResolvedIssues = async (city: string, query = '') => {
    if (!city) {
      setIssues([]);
      return;
    }

    setLoading(true);
    try {
      let queryBuilder = supabase
        .from('issues')
        .select('*')
        .eq('status', 'resolved')
        .ilike('location_name', `${city},%`)
        .order('resolved_at', { ascending: false });

      if (query) {
        queryBuilder = queryBuilder.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
      }

      const { data, error } = await queryBuilder.limit(20);

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error fetching resolved issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resolved issues. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && selectedCity) {
      fetchResolvedIssues(selectedCity, searchQuery);
    }
  }, [open, selectedCity, searchQuery]);

  const calculateResolutionTime = (createdAt: string, resolvedAt: string) => {
    const created = new Date(createdAt);
    const resolved = new Date(resolvedAt);
    const diffMs = resolved.getTime() - created.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    }
    return `${diffHours}h`;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      roads: 'bg-civic-orange text-civic-orange-foreground',
      streetlights: 'bg-yellow-500 text-white',
      parks: 'bg-civic-green text-civic-green-foreground',
      toilets: 'bg-blue-500 text-white',
      water: 'bg-cyan-500 text-white',
      electricity: 'bg-yellow-600 text-white',
      waste: 'bg-gray-500 text-white',
      other: 'bg-gray-400 text-white',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Resolved Issues
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-civic-green">
            <CheckCircle className="h-5 w-5" />
            Resolved Issues
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedCity} onValueChange={setSelectedCity}>
              <SelectTrigger className="flex-1 bg-card">
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent className="bg-card border z-50">
                <SelectItem value="Dehradun">Dehradun</SelectItem>
                <SelectItem value="Mumbai">Mumbai</SelectItem>
                <SelectItem value="New Delhi">New Delhi</SelectItem>
                <SelectItem value="Bangalore">Bangalore</SelectItem>
                <SelectItem value="Chennai">Chennai</SelectItem>
                <SelectItem value="Kolkata">Kolkata</SelectItem>
                <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                <SelectItem value="Pune">Pune</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search resolved issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-card"
              />
            </div>
          </div>

          {/* Issues List */}
          {!selectedCity ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Select a City</h3>
              <p className="text-muted-foreground">
                Choose a city to see resolved issues and their resolution times.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : issues.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-civic-green mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Resolved Issues</h3>
              <p className="text-muted-foreground">
                No resolved issues found in {selectedCity} matching your search.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {issues.map((issue) => (
                <Card key={issue.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(issue.category)}>
                            {issue.category}
                          </Badge>
                          <Badge className="bg-civic-green text-civic-green-foreground">
                            Resolved
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-civic-green">
                            <Clock className="h-3 w-3" />
                            Resolved in {calculateResolutionTime(issue.created_at, issue.resolved_at)}
                          </div>
                        </div>
                        
                        <h4 className="font-semibold text-foreground mb-1">{issue.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {issue.description}
                        </p>
                        
                        {issue.resolution_comment && (
                          <div className="bg-civic-green/10 border border-civic-green/20 rounded-lg p-3 mb-2">
                            <p className="text-sm text-civic-green font-medium mb-1">Resolution Note:</p>
                            <p className="text-sm text-muted-foreground">{issue.resolution_comment}</p>
                          </div>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {issue.location_name}
                          </span>
                          <span>
                            Reported: {new Date(issue.created_at).toLocaleDateString()}
                          </span>
                          <span>
                            Resolved: {new Date(issue.resolved_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {issue.image_url && (
                          <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                            <img 
                              src={issue.image_url} 
                              alt="Issue" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {issue.resolution_image_url && (
                          <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden border-2 border-civic-green">
                            <img 
                              src={issue.resolution_image_url} 
                              alt="Resolution" 
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ResolvedIssuesBrowser;