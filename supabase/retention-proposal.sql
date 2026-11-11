-- PROPOSITION NON EXÉCUTÉE. Nécessite l'accord de l'éditeur.
-- Périmètre : uniquement les compteurs quotidiens de Cap 2027 de plus de 30 jours.
-- Aucune autre table des applications du projet n'est ciblée.
select cron.schedule(
 'cap2027-prune-ai-counters',
 '20 3 * * *',
 $job$ delete from public.cap27_ai_usage where day < current_date-30; $job$
);
