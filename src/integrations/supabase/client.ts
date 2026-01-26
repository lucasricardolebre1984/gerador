// Este arquivo é gerado automaticamente. Não o edite diretamente.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://kioahbosclyrsiychxon.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtpb2FoYm9zY2x5cnNpeWNoeG9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzOTk2MDYsImV4cCI6MjA4NDk3NTYwNn0.Q8g_edZnsEmOr2H1K-EekCM6Ay2w97KDIU3sB0JcAto";

// Importe o cliente supabase assim:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);