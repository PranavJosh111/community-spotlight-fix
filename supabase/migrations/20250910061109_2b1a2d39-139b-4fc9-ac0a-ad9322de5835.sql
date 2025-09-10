-- Insert dummy issues data for testing
INSERT INTO public.issues (
  title, 
  description, 
  category, 
  status, 
  location_name, 
  reported_by, 
  latitude, 
  longitude, 
  upvotes_count,
  image_url
) VALUES 
-- Dehradun issues
('Broken streetlight on Rajpur Road', 'The streetlight near Clock Tower has been non-functional for 2 weeks, causing safety concerns for pedestrians.', 'streetlights', 'open', 'Dehradun, Uttarakhand', '00000000-0000-0000-0000-000000000001', 30.3165, 78.0322, 45, 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400'),
('Pothole on Saharanpur Road', 'Large pothole causing damage to vehicles and creating traffic congestion during rush hours.', 'roads', 'in_progress', 'Dehradun, Uttarakhand', '00000000-0000-0000-0000-000000000001', 30.3398, 78.0664, 78, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400'),
('Park gate broken at Mindrolling Monastery area', 'The main entrance gate to the community park is damaged and needs immediate repair.', 'parks', 'open', 'Dehradun, Uttarakhand', '00000000-0000-0000-0000-000000000001', 30.2961, 78.1089, 23, 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400'),
('Water supply disruption in Vasant Vihar', 'No water supply for the past 3 days in Vasant Vihar colony affecting 200+ families.', 'water', 'open', 'Dehradun, Uttarakhand', '00000000-0000-0000-0000-000000000001', 30.3255, 78.0436, 112, 'https://images.unsplash.com/photo-1582408921715-18e7806365c1?w=400'),
('Overflowing garbage bin at Pacific Mall', 'Garbage bins outside Pacific Mall are overflowing, creating unhygienic conditions.', 'waste', 'resolved', 'Dehradun, Uttarakhand', '00000000-0000-0000-0000-000000000001', 30.3077, 78.0673, 34, 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'),

-- Mumbai issues
('Traffic signal malfunction at Bandra-Kurla Complex', 'Traffic signals not working properly causing major traffic jams during peak hours.', 'roads', 'open', 'Mumbai, Maharashtra', '00000000-0000-0000-0000-000000000001', 19.0596, 72.8295, 156, 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400'),
('Street flooding in Andheri West', 'Poor drainage system causing waterlogging during monsoon affecting daily commute.', 'water', 'in_progress', 'Mumbai, Maharashtra', '00000000-0000-0000-0000-000000000001', 19.1136, 72.8697, 203, 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400'),
('Public toilet maintenance required at Juhu Beach', 'Public toilets near Juhu Beach are in poor condition and need immediate cleaning and repair.', 'toilets', 'open', 'Mumbai, Maharashtra', '00000000-0000-0000-0000-000000000001', 19.1075, 72.8263, 87, 'https://images.unsplash.com/photo-1571167530149-c0c1ca82af5b?w=400'),

-- Delhi issues
('Air pollution monitoring needed in Connaught Place', 'High air pollution levels affecting public health, need better monitoring and action.', 'other', 'open', 'New Delhi, Delhi', '00000000-0000-0000-0000-000000000001', 28.6315, 77.2167, 298, 'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400'),
('Metro station elevator out of order', 'Elevator at Rajiv Chowk metro station has been non-functional for a week.', 'other', 'in_progress', 'New Delhi, Delhi', '00000000-0000-0000-0000-000000000001', 28.6330, 77.2194, 134, 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400');