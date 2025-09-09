import { useState, useEffect } from 'react';
import { MapPin, ThumbsUp, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  upvotes_count: number;
  location_name: string;
  created_at: string;
  image_url?: string;
  reported_by: string;
}

const IssuesBrowser = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());

  const states = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
    'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
    'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi'
  ];

  const cities = {
    'Andhra Pradesh': ['Hyderabad', 'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum'],
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Thane', 'Nashik'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem'],
    'Delhi': ['New Delhi', 'Central Delhi', 'North Delhi', 'South Delhi', 'East Delhi'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam'],
  } as Record<string, string[]>;

  const availableCities = selectedState ? cities[selectedState] || [] : [];

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

  const fetchUserUpvotes = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('upvotes')
        .select('issue_id')
        .eq('user_id', user.id);

      if (error) throw error;
      setUserUpvotes(new Set(data.map(upvote => upvote.issue_id)));
    } catch (error) {
      console.error('Error fetching user upvotes:', error);
    }
  };

  const fetchIssues = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('issues')
        .select('*')
        .eq('status', 'open')
        .order('upvotes_count', { ascending: false });

      if (selectedCity && selectedState) {
        query = query.ilike('location_name', `%${selectedCity}%`);
      } else if (selectedState) {
        query = query.ilike('location_name', `%${selectedState}%`);
      }

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.limit(20);

      if (error) throw error;
      setIssues(data || []);
    } catch (error) {
      console.error('Error fetching issues:', error);
      toast({
        title: 'Error',
        description: 'Failed to load issues. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpvote = async (issueId: string) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to upvote issues.',
        variant: 'destructive',
      });
      return;
    }

    const isUpvoted = userUpvotes.has(issueId);

    try {
      if (isUpvoted) {
        // Remove upvote
        const { error } = await supabase
          .from('upvotes')
          .delete()
          .eq('user_id', user.id)
          .eq('issue_id', issueId);

        if (error) throw error;

        setUserUpvotes(prev => {
          const newSet = new Set(prev);
          newSet.delete(issueId);
          return newSet;
        });

        // Update local state
        setIssues(prev => prev.map(issue => 
          issue.id === issueId 
            ? { ...issue, upvotes_count: Math.max(0, issue.upvotes_count - 1) }
            : issue
        ));

        toast({
          title: 'Success',
          description: 'Upvote removed successfully!',
        });
      } else {
        // Add upvote
        const { error } = await supabase
          .from('upvotes')
          .insert({
            user_id: user.id,
            issue_id: issueId,
          });

        if (error) throw error;

        setUserUpvotes(prev => new Set([...prev, issueId]));

        // Update local state
        setIssues(prev => prev.map(issue => 
          issue.id === issueId 
            ? { ...issue, upvotes_count: issue.upvotes_count + 1 }
            : issue
        ));

        toast({
          title: 'Success',
          description: 'Issue upvoted successfully!',
        });
      }
    } catch (error) {
      console.error('Error toggling upvote:', error);
      toast({
        title: 'Error',
        description: 'Failed to update upvote. Please try again.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (open && user) {
      fetchUserUpvotes();
    }
  }, [open, user]);

  useEffect(() => {
    if (selectedState || searchQuery) {
      fetchIssues();
    }
  }, [selectedState, selectedCity, searchQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg">
          <ThumbsUp className="mr-2 h-5 w-5" />
          Support Issues
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Support Issues in Your Area</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select onValueChange={(value) => {
              setSelectedState(value);
              setSelectedCity('');
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              onValueChange={setSelectedCity} 
              disabled={!selectedState}
              value={selectedCity}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {availableCities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {loading ? (
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
              <Card>
                <CardContent className="p-8 text-center">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-foreground mb-2">
                    {selectedState || searchQuery ? 'No Issues Found' : 'Select Location'}
                  </h4>
                  <p className="text-muted-foreground">
                    {selectedState || searchQuery 
                      ? 'No issues found matching your criteria.'
                      : 'Please select a state to view issues in your area.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              issues.map((issue) => (
                <Card key={issue.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getCategoryColor(issue.category)}>
                            {issue.category}
                          </Badge>
                          <Badge 
                            variant={issue.status === 'resolved' ? 'default' : issue.status === 'in_progress' ? 'secondary' : 'outline'}
                            className={issue.status === 'resolved' ? 'bg-civic-green text-civic-green-foreground' : 
                                      issue.status === 'in_progress' ? 'bg-civic-orange text-civic-orange-foreground' : ''}
                          >
                            {issue.status?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground mb-1">{issue.title}</h4>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {issue.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {issue.location_name}
                            </span>
                            <span>
                              {new Date(issue.created_at).toLocaleDateString()}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant={userUpvotes.has(issue.id) ? "default" : "outline"}
                            onClick={() => handleUpvote(issue.id)}
                            className={userUpvotes.has(issue.id) ? "bg-civic-blue hover:bg-civic-blue/90" : ""}
                          >
                            <ThumbsUp className="h-4 w-4 mr-1" />
                            {issue.upvotes_count || 0}
                          </Button>
                        </div>
                      </div>
                      {issue.image_url && (
                        <div className="w-16 h-16 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                          <img 
                            src={issue.image_url} 
                            alt="Issue" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IssuesBrowser;