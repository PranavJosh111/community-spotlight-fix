import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Plus, TrendingUp, MapPin, Clock, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import MobileNavigation from '@/components/layout/MobileNavigation';
import { useToast } from '@/components/ui/use-toast';
import ReportIssueDialog from '@/components/forms/ReportIssueDialog';
import IssuesBrowser from '@/components/issues/IssuesBrowser';
import ResolvedIssuesBrowser from '@/components/issues/ResolvedIssuesBrowser';

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
}

const Index = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(true);
  const [userUpvotes, setUserUpvotes] = useState<Set<string>>(new Set());
  const [selectedCity, setSelectedCity] = useState<string>('');

  useEffect(() => {
    if (user) {
      fetchUserUpvotes();
    }
  }, [user]);

  useEffect(() => {
    if (user && selectedCity) {
      fetchIssues(selectedCity);
    }
  }, [user, selectedCity]);

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

  const fetchIssues = async (city?: string) => {
    if (!city) {
      setIssues([]);
      setLoadingIssues(false);
      return;
    }

    setLoadingIssues(true);
    try {
      const { data, error } = await supabase
        .from('issues')
        .select('*')
        .ilike('location_name', `${city},%`)
        .order('upvotes_count', { ascending: false })
        .limit(10);

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
      setLoadingIssues(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-civic-blue mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

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
    <div className="min-h-screen bg-background pb-20 md:pb-4">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Hero Section */}
        <section className="text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Help Improve Your Community
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Report infrastructure issues, upvote concerns that affect you, and track their resolution.
            Together, we can make our community better.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <ReportIssueDialog onIssueReported={() => fetchIssues(selectedCity)} />
            <IssuesBrowser />
            <ResolvedIssuesBrowser />
          </div>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-civic-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">1,247</div>
              <div className="text-xs text-muted-foreground">Issues Reported</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <MapPin className="h-8 w-8 text-civic-green mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">892</div>
              <div className="text-xs text-muted-foreground">Issues Resolved</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-civic-orange mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">48h</div>
              <div className="text-xs text-muted-foreground">Avg Response</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Plus className="h-8 w-8 text-civic-blue mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">15,432</div>
              <div className="text-xs text-muted-foreground">Total Upvotes</div>
            </CardContent>
          </Card>
        </section>

        {/* City Selection & Recent Issues */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-foreground">Trending Issues</h3>
            <div className="flex items-center gap-4">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[200px] bg-card">
                  <SelectValue placeholder="Select your city" />
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
              <Button variant="outline" size="sm">
                View All
              </Button>
            </div>
          </div>

          {!selectedCity ? (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h4 className="text-lg font-medium text-foreground mb-2">Select Your City</h4>
                <p className="text-muted-foreground mb-4">
                  Choose your city to see trending issues in your area and make your voice heard.
                </p>
              </CardContent>
            </Card>
          ) : loadingIssues ? (
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
          ) : (
            <div className="space-y-4">
              {issues.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-foreground mb-2">No Issues in {selectedCity}</h4>
                    <p className="text-muted-foreground mb-4">
                      Be the first to report an infrastructure issue in {selectedCity}.
                    </p>
                    <ReportIssueDialog onIssueReported={() => fetchIssues(selectedCity)} />
                  </CardContent>
                </Card>
              ) : (
                issues.map((issue) => (
                  <Card key={issue.id} className="hover:shadow-md transition-shadow cursor-pointer">
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpvote(issue.id);
                                }}
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
          )}
        </section>
      </main>

      <MobileNavigation />
    </div>
  );
};

export default Index;
