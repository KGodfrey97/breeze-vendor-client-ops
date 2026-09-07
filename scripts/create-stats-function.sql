-- Create a function to get claim status counts
CREATE OR REPLACE FUNCTION public.get_claim_status_counts()
RETURNS TABLE(status TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT a.status, COUNT(*)::BIGINT
  FROM public.claims a
  GROUP BY a.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION public.get_claim_status_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_claim_status_counts() TO service_role;
