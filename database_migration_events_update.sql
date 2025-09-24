-- Database Migration: Event Updates and Additions
-- Date: September 14, 2025
-- Description: Update existing event timings and add new SEVEN collaboration workshops

BEGIN TRANSACTION;

-- 1. Update Mechanical Keyboard Interest Group workshop timing on September 15th
-- Change from 19:00-20:30 to 16:00-17:30
UPDATE calendar_events 
SET start_time = '16:00:00', 
    end_time = '17:30:00',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Mechanical Keyboard Interest Group' 
  AND event_date = '2025-09-15' 
  AND start_time = '19:00:00'
  AND end_time = '20:30:00';

-- 2. Update SUTD AI Interest Group Session date
-- Change from September 30th to October 8th
UPDATE calendar_events 
SET event_date = '2025-10-08',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'SUTD AI Interest Group Session' 
  AND event_date = '2025-09-30'
  AND start_time = '19:00:00';

-- 3. Insert new SEVEN collaboration workshops and hackathon
INSERT INTO calendar_events (title, description, event_date, start_time, end_time, event_type, location, color, max_participants, current_participants, user_id, is_active) VALUES

-- Make a Telegram Bot Workshop (3DC x SEVEN)
('Make a Telegram Bot Workshop (3DC x SEVEN)', 'Collaborative workshop between 3DC and SEVEN on building Telegram bots. Learn to create interactive bots using modern frameworks and APIs.', '2025-09-17', '13:00:00', '18:00:00', 'Optional', 'Think Tank 16 @2.201', '#EF5800', NULL, 0, 1, TRUE),

-- Coding with Electronics - ESP32 Workshop (SOAR x SEVEN)
('Coding with Electronics - ESP32 Workshop (SOAR x SEVEN)', 'Hands-on workshop combining robotics and software development. Learn to program ESP32 microcontrollers for IoT projects.', '2025-09-24', '13:00:00', '18:00:00', 'Optional', 'Think Tank 16 @2.201', '#EF5800', NULL, 0, 1, TRUE),

-- MVP Hackathon by SEVEN
('MVP Hackathon by SEVEN', 'Intensive hackathon focused on building Minimum Viable Products. Work in teams to develop and present innovative solutions within a day.', '2025-09-26', '13:00:00', '18:00:00', 'Optional', 'Library Park Scape & Library Level 2 Tables', '#EF5800', NULL, 0, 1, TRUE),

-- Supper with Seniors (September session)
('Supper with Seniors', 'Hear stories, advice and tips from seniors over a casual dinner. Connect with upperclassmen and learn from their SUTD experiences.', '2025-09-18', '19:00:00', '21:00:00', 'Optional', 'MPH', '#EF5800', NULL, 0, 1, TRUE),

-- SUTD Unfiltered
('SUTD Unfiltered', 'Get to know SUTD professors and alumni in an informal setting. Candid conversations about academic life, career paths, and insider perspectives.', '2025-09-25', '19:00:00', '21:00:00', 'Optional', 'LT4', '#EF5800', NULL, 0, 1, TRUE),

-- Supper with Seniors (October session)
('Supper with Seniors', 'Hear stories, advice and tips from seniors over a casual dinner. Connect with upperclassmen and learn from their SUTD experiences.', '2025-10-02', '19:00:00', '21:00:00', 'Optional', 'MPH', '#EF5800', NULL, 0, 1, TRUE),

-- Finale Night
('Finale Night', 'Evening of music, food and picnic under the stars. Celebrate the end of orientation with live performances, great food, and community bonding.', '2025-10-09', '19:00:00', '21:00:00', 'Optional', 'SUTD Stadium (Field)', '#EF5800', NULL, 0, 1, TRUE),

-- Additional Touch Football Session
('Touch Football Session', 'Touch football practice game.', '2025-10-06', '19:30:00', '22:30:00', 'Optional', 'Outdoor Field', '#EF5800', NULL, 0, 1, TRUE)

ON CONFLICT (title, event_date, start_time) DO NOTHING;

-- 4. Remove duplicate/unwanted Climbing Club events
DELETE FROM calendar_events 
WHERE (title = 'Climbing Club Session' 
       AND event_date = '2025-09-25' 
       AND start_time = '19:00:00'
       AND end_time = '21:00:00'
       AND location = 'Climbing Wall')
   OR (title = 'Climbers Club Session' 
       AND event_date = '2025-09-17' 
       AND start_time = '19:00:00'
       AND end_time = '21:00:00'
       AND location = 'Climbing Wall');

-- 5. Remove original SEVEN events (being replaced by collaboration workshops)
DELETE FROM calendar_events 
WHERE title IN (
    'SEVEN Telegram Bot Workshop',
    'SEVEN Hackathon Day', 
    'SEVEN Art of Design Workshop',
    'SEVEN Talk with Founders & VIE'
) AND (
    (title = 'SEVEN Telegram Bot Workshop' AND event_date = '2025-09-17' AND start_time = '14:00:00' AND location = 'Hack Lab')
    OR (title = 'SEVEN Hackathon Day' AND event_date = '2025-09-19' AND start_time = '14:00:00' AND location = 'Innovation Workspace')
    OR (title = 'SEVEN Art of Design Workshop' AND event_date = '2025-10-01' AND start_time = '14:00:00' AND location = 'Design Studio')
    OR (title = 'SEVEN Talk with Founders & VIE' AND event_date = '2025-10-03' AND start_time = '14:00:00' AND location = 'Lecture Theatre 2')
);

-- 6. Update Chinese Orchestra Club Rehearsal locations
-- Update Sept 15 and Sept 22 to Music Room 1
UPDATE calendar_events 
SET location = 'Music Room 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Chinese Orchestra Club Rehearsal' 
  AND event_date IN ('2025-09-15', '2025-09-22')
  AND start_time = '19:30:00'
  AND location = 'Orchestra Room';

-- Update Sept 16 and Sept 23 to Dance Studio 3
UPDATE calendar_events 
SET location = 'Dance Studio 3',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Chinese Orchestra Club Rehearsal' 
  AND event_date IN ('2025-09-16', '2025-09-23')
  AND location = 'Orchestra Room';

-- 7. Remove unwanted Chinese Orchestra and Bands events
DELETE FROM calendar_events 
WHERE (title = 'Chinese Orchestra Club Rehearsal' 
       AND event_date = '2025-09-18' 
       AND start_time = '19:30:00'
       AND location = 'Orchestra Room')
   OR (title = 'Chinese Orchestra Club Marathon Rehearsal' 
       AND event_date = '2025-09-20' 
       AND start_time = '11:00:00'
       AND location = 'Orchestra Room')
   OR (title = 'Bands: Picnic at the Disco (Crew Workshop)' 
       AND event_date = '2025-10-01' 
       AND start_time = '11:00:00'
       AND location = 'Music Studio')
   OR (title = 'Bands: Camp Rock' 
       AND event_date = '2025-10-03' 
       AND start_time = '15:00:00'
       AND location = 'Music Studio')
   OR (title = 'Bands: Camp Rock' 
       AND event_date = '2025-10-04' 
       AND start_time = '09:00:00'
       AND location = 'Music Studio')
   OR (title = 'Bands: Instrument Workshop'
       AND event_date = '2025-09-29'
       AND start_time = '19:00:00'
       AND location = 'Music Studio')
   OR (title = 'Greenprint Flower Workshop'
       AND event_date = '2025-09-18'
       AND start_time = '14:00:00'
       AND location = 'Green Lab')
   OR (title = 'Greenprint Wax Workshop'
       AND event_date = '2025-09-24'
       AND start_time = '14:00:00'
       AND location = 'Green Lab')
   OR (title = 'Chinese Culture Club Workshop' 
       AND event_date IN ('2025-09-19', '2025-09-21', '2025-09-23', '2025-09-25')
       AND start_time = '19:00:00'
       AND location = 'Cultural Centre Room A')
   OR (title = 'Wind Ensemble Rehearsal' 
       AND event_date IN ('2025-09-16', '2025-09-23', '2025-09-30', '2025-10-07')
       AND start_time = '19:30:00'
       AND location = 'Music Room')
   OR (title = 'Scratch Programming Workshop' 
       AND event_date IN ('2025-09-15', '2025-09-18', '2025-09-19')
       AND start_time = '19:00:00'
       AND location = 'Computer Lab');

-- 8. Update Bands Instrument Workshop titles and locations
-- Update Sept 22 - Vocals - LT4
UPDATE calendar_events 
SET title = 'Bands: Vocals',
    description = 'Vocal techniques and performance workshop for band members.',
    location = 'LT4',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Bands: Instrument Workshop' 
  AND event_date = '2025-09-22'
  AND start_time = '19:00:00';

-- Update Sept 23 - Guitar - LT3
UPDATE calendar_events 
SET title = 'Bands: Guitar',
    description = 'Guitar skills and techniques workshop for band members.',
    location = 'LT3',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Bands: Instrument Workshop' 
  AND event_date = '2025-09-23'
  AND start_time = '19:00:00';

-- Update Sept 24 - Bass - TT21
UPDATE calendar_events 
SET title = 'Bands: Bass',
    description = 'Bass guitar techniques and rhythm workshop for band members.',
    location = 'TT21',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Bands: Instrument Workshop' 
  AND event_date = '2025-09-24'
  AND start_time = '19:00:00';

-- Update Sept 25 - Keys - LT3
UPDATE calendar_events 
SET title = 'Bands: Keys',
    description = 'Keyboard and piano skills workshop for band members.',
    location = 'LT3',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Bands: Instrument Workshop' 
  AND event_date = '2025-09-25'
  AND start_time = '19:00:00';

-- Update Sept 26 - Drums - LT4
UPDATE calendar_events 
SET title = 'Bands: Drums',
    description = 'Drumming techniques and rhythm workshop for band members.',
    location = 'LT4',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Bands: Instrument Workshop' 
  AND event_date = '2025-09-26'
  AND start_time = '19:00:00';

-- Update Sept 30 - Sounds - TT21
UPDATE calendar_events 
SET title = 'Bands: Sounds',
    description = 'Sound engineering and audio production workshop for band members.',
    location = 'TT21',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Bands: Instrument Workshop' 
  AND event_date = '2025-09-30'
  AND start_time = '19:00:00';

-- 9. Update Chinese Culture Club Introduction to Seal Engraving Workshop
UPDATE calendar_events 
SET title = 'Chinese Culture Club Seal Engraving Workshop',
    description = 'Traditional Chinese seal engraving workshop. Learn the art of creating personalized Chinese seals using traditional techniques and tools.',
    event_date = '2025-09-15',
    start_time = '15:30:00',
    end_time = '17:30:00',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Chinese Culture Club Introduction' 
  AND event_date = '2025-09-17'
  AND start_time = '19:00:00'
  AND location = 'Cultural Centre Room A';

-- 10. Update EV Club Meeting to Introduction Q&A
UPDATE calendar_events 
SET title = 'EV Club Introduction Q&A',
    description = 'Introduction session and Q&A about electric vehicle projects, club activities, and opportunities to get involved in EV development.',
    event_date = '2025-09-17',
    start_time = '13:30:00',
    end_time = '15:30:00',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'EV Club Meeting' 
  AND event_date = '2025-10-08'
  AND start_time = '14:00:00'
  AND location = 'Engineering Lab';

-- 11. Update Ultimate Frisbee Intro Session date
UPDATE calendar_events 
SET event_date = '2025-10-01',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Ultimate Frisbee Intro Session' 
  AND event_date = '2025-09-17'
  AND start_time = '19:30:00'
  AND location = 'Outdoor Sports Field';

-- 12. Update Project Management Interest Group Meeting locations
UPDATE calendar_events 
SET location = 'Think Tank 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Project Management Interest Group Meeting' 
  AND event_date IN ('2025-09-25', '2025-10-07')
  AND start_time = '19:00:00'
  AND location = 'Business Lab';

-- 13. Update Wind Ensemble Rehearsal sessions to specialized instrument workshops
-- Update Sept 18 - Percussions
UPDATE calendar_events 
SET title = 'Wind Ensemble - Percussions',
    description = 'Have you ever played an instrument? Do you wanna play an instrument? Wind Ensemble is bringing to you the Introductory Sessions series, where you can try out different instruments and pick up the one you like the most. We''ll be guiding you through these sessions, so we hope you come down and give it a go!',
    location = 'Music Room 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Wind Ensemble Rehearsal' 
  AND event_date = '2025-09-18'
  AND start_time = '19:30:00';

-- Update Sept 25 - Brasses
UPDATE calendar_events 
SET title = 'Wind Ensemble - Brasses',
    description = 'Have you ever played an instrument? Do you wanna play an instrument? Wind Ensemble is bringing to you the Introductory Sessions series, where you can try out different instruments and pick up the one you like the most. We''ll be guiding you through these sessions, so we hope you come down and give it a go!',
    location = 'Music Room 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Wind Ensemble Rehearsal' 
  AND event_date = '2025-09-25'
  AND start_time = '19:30:00';

-- Update Oct 2 - Woodwinds
UPDATE calendar_events 
SET title = 'Wind Ensemble - Woodwinds',
    description = 'Have you ever played an instrument? Do you wanna play an instrument? Wind Ensemble is bringing to you the Introductory Sessions series, where you can try out different instruments and pick up the one you like the most. We''ll be guiding you through these sessions, so we hope you come down and give it a go!',
    location = 'Music Room 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Wind Ensemble Rehearsal' 
  AND event_date = '2025-10-02'
  AND start_time = '19:30:00';

-- Update Oct 9 - All
UPDATE calendar_events 
SET title = 'Wind Ensemble - All',
    description = 'Have you ever played an instrument? Do you wanna play an instrument? Wind Ensemble is bringing to you the Introductory Sessions series, where you can try out different instruments and pick up the one you like the most. We''ll be guiding you through these sessions, so we hope you come down and give it a go!',
    location = 'Music Room 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Wind Ensemble Rehearsal' 
  AND event_date = '2025-10-09'
  AND start_time = '19:30:00';

-- 14. Update Floorball Club Games to Introductory Sessions
-- Update Sept 24 to Sept 19 - First Intro Session
UPDATE calendar_events 
SET title = 'Floorball Club Introductory Sessions',
    description = 'Introduction to floorball for beginners and newcomers. Learn the basics of the game, rules, and techniques in a friendly environment.',
    event_date = '2025-09-19',
    location = 'ISH 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Floorball Club Game' 
  AND event_date = '2025-09-24'
  AND start_time = '19:00:00'
  AND location = 'Sports Hall';

-- Update Oct 8 to Sept 29 - Second Intro Session
UPDATE calendar_events 
SET title = 'Floorball Club Introductory Sessions',
    description = 'Introduction to floorball for beginners and newcomers. Learn the basics of the game, rules, and techniques in a friendly environment.',
    event_date = '2025-09-29',
    location = 'ISH 1',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Floorball Club Game' 
  AND event_date = '2025-10-08'
  AND start_time = '19:00:00'
  AND location = 'Sports Hall';

-- 15. Update Ballroom Dancing Club Sessions
-- Update Sept 24 to Oct 1 with extended timing
UPDATE calendar_events 
SET event_date = '2025-10-01',
    start_time = '19:30:00',
    end_time = '22:30:00',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Ballroom Dancing Club Session' 
  AND event_date = '2025-09-24'
  AND start_time = '19:30:00'
  AND end_time = '21:00:00'
  AND location = 'Dance Studio';

-- Update existing sessions to extended timing (19:30-22:30)
UPDATE calendar_events 
SET start_time = '19:30:00',
    end_time = '22:30:00',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Ballroom Dancing Club Session' 
  AND event_date IN ('2025-10-01', '2025-10-03', '2025-10-08')
  AND start_time = '19:30:00'
  AND end_time = '21:00:00'
  AND location = 'Dance Studio';

-- 16. Update Scratch Programming Workshop sessions
-- Update Sept 16 session
UPDATE calendar_events 
SET title = 'SCRATCH',
    description = 'Music to your ears',
    start_time = '19:00:00',
    end_time = '21:00:00',
    location = 'TBC',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Scratch Programming Workshop' 
  AND event_date = '2025-09-16'
  AND start_time = '19:00:00'
  AND end_time = '20:30:00'
  AND location = 'Computer Lab';

-- Update Sept 17 session
UPDATE calendar_events 
SET title = 'SCRATCH',
    description = 'Music to your ears',
    start_time = '19:00:00',
    end_time = '21:00:00',
    location = 'TBC',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Scratch Programming Workshop' 
  AND event_date = '2025-09-17'
  AND start_time = '19:00:00'
  AND end_time = '20:30:00'
  AND location = 'Computer Lab';

-- 17. Update Writer's Block Meetup description
UPDATE calendar_events 
SET description = 'Casual gathering of Writer''s Block members',
    updated_at = CURRENT_TIMESTAMP
WHERE title = 'Writer''s Block Meetup' 
  AND event_date = '2025-10-01'
  AND start_time = '19:00:00'
  AND location = 'Literature Lounge';

-- 18. Verify the changes made
SELECT 'Mechanical Keyboard Workshop Update' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Mechanical Keyboard Interest Group' 
  AND event_date = '2025-09-15' 
  AND start_time = '16:00:00'
  AND end_time = '17:30:00'

UNION ALL

SELECT 'AI Interest Group Date Update' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'SUTD AI Interest Group Session' 
  AND event_date = '2025-10-08'

UNION ALL

SELECT 'New SEVEN Events Added' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title IN (
    'Make a Telegram Bot Workshop (3DC x SEVEN)',
    'Coding with Electronics - ESP32 Workshop (SOAR x SEVEN)', 
    'MVP Hackathon by SEVEN'
)

UNION ALL

SELECT 'New Orientation Events Added' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title IN (
    'Supper with Seniors',
    'SUTD Unfiltered',
    'Finale Night',
    'Touch Football Session'
) AND event_date >= '2025-09-18'

UNION ALL

SELECT 'Climbing Events Removed' as change_type, 
       CASE WHEN COUNT(*) = 0 THEN 2 ELSE COUNT(*) END as affected_rows
FROM calendar_events 
WHERE (title = 'Climbing Club Session' AND event_date = '2025-09-25')
   OR (title = 'Climbers Club Session' AND event_date = '2025-09-17')

UNION ALL

SELECT 'Original SEVEN Events Removed' as change_type,
       CASE WHEN COUNT(*) = 0 THEN 4 ELSE COUNT(*) END as affected_rows
FROM calendar_events 
WHERE title IN (
    'SEVEN Telegram Bot Workshop',
    'SEVEN Hackathon Day', 
    'SEVEN Art of Design Workshop',
    'SEVEN Talk with Founders & VIE'
)

UNION ALL

SELECT 'Chinese Orchestra Location Updates' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Chinese Orchestra Club Rehearsal' 
  AND event_date IN ('2025-09-15', '2025-09-22', '2025-09-16', '2025-09-23')
  AND location IN ('Music Room 1', 'Dance Studio 3')

UNION ALL

SELECT 'Various Events Removed' as change_type,
       CASE WHEN COUNT(*) = 0 THEN 19 ELSE COUNT(*) END as affected_rows
FROM calendar_events 
WHERE (title = 'Chinese Orchestra Club Rehearsal' AND event_date = '2025-09-18')
   OR (title = 'Chinese Orchestra Club Marathon Rehearsal' AND event_date = '2025-09-20')
   OR (title = 'Bands: Picnic at the Disco (Crew Workshop)' AND event_date = '2025-10-01')
   OR (title = 'Bands: Camp Rock' AND event_date IN ('2025-10-03', '2025-10-04'))
   OR (title = 'Bands: Instrument Workshop' AND event_date = '2025-09-29')
   OR (title = 'Greenprint Flower Workshop' AND event_date = '2025-09-18')
   OR (title = 'Greenprint Wax Workshop' AND event_date = '2025-09-24')
   OR (title = 'Chinese Culture Club Workshop' AND event_date IN ('2025-09-19', '2025-09-21', '2025-09-23', '2025-09-25'))
   OR (title = 'Wind Ensemble Rehearsal' AND event_date IN ('2025-09-16', '2025-09-23', '2025-09-30', '2025-10-07'))
   OR (title = 'Scratch Programming Workshop' AND event_date IN ('2025-09-15', '2025-09-18', '2025-09-19'))

UNION ALL

SELECT 'Bands Instrument Workshops Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title IN ('Bands: Vocals', 'Bands: Guitar', 'Bands: Bass', 'Bands: Keys', 'Bands: Drums', 'Bands: Sounds')
  AND event_date BETWEEN '2025-09-22' AND '2025-09-30'

UNION ALL

SELECT 'Chinese Culture Club Event Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Chinese Culture Club Seal Engraving Workshop'
  AND event_date = '2025-09-15'
  AND start_time = '15:30:00'

UNION ALL

SELECT 'EV Club Event Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'EV Club Introduction Q&A'
  AND event_date = '2025-09-17'
  AND start_time = '13:30:00'

UNION ALL

SELECT 'Ultimate Frisbee Date Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Ultimate Frisbee Intro Session'
  AND event_date = '2025-10-01'
  AND start_time = '19:30:00'

UNION ALL

SELECT 'Project Management Locations Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Project Management Interest Group Meeting'
  AND event_date IN ('2025-09-25', '2025-10-07')
  AND location = 'Think Tank 1'

UNION ALL

SELECT 'Wind Ensemble Workshops Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title IN ('Wind Ensemble - Percussions', 'Wind Ensemble - Brasses', 'Wind Ensemble - Woodwinds', 'Wind Ensemble - All')
  AND location = 'Music Room 1'

UNION ALL

SELECT 'Floorball Events Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Floorball Club Introductory Sessions'
  AND event_date IN ('2025-09-19', '2025-09-29')
  AND location = 'ISH 1'

UNION ALL

SELECT 'Ballroom Dancing Sessions Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Ballroom Dancing Club Session'
  AND event_date IN ('2025-10-01', '2025-10-03', '2025-10-08')
  AND start_time = '19:30:00'
  AND end_time = '22:30:00'

UNION ALL

SELECT 'SCRATCH Sessions Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'SCRATCH'
  AND event_date IN ('2025-09-16', '2025-09-17')
  AND location = 'TBC'
  AND description = 'Music to your ears'

UNION ALL

SELECT 'Writer''s Block Description Updated' as change_type, COUNT(*) as affected_rows
FROM calendar_events 
WHERE title = 'Writer''s Block Meetup'
  AND event_date = '2025-10-01'
  AND description = 'Casual gathering of Writer''s Block members';

-- Commit the transaction
COMMIT;

-- Final verification query (run separately if needed)
-- SELECT title, event_date, start_time, end_time, location 
-- FROM calendar_events 
-- WHERE (title = 'Mechanical Keyboard Interest Group' AND event_date = '2025-09-15')
--    OR (title = 'SUTD AI Interest Group Session' AND event_date = '2025-10-08')
--    OR title LIKE '%SEVEN%'
-- ORDER BY event_date, start_time;

