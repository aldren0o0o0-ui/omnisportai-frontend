export const mapChampionshipSportBreakdown = (rows = []) => (
  (Array.isArray(rows) ? rows : []).map((row) => {
    const placement = (rank) => row?.placements?.[rank] || row?.placements?.[String(rank)] || null;
    const identity = (rank) => {
      const item = placement(rank);
      return {
        name: item?.entry_name || "-",
        department: item?.department_code || item?.department_name || "-",
        logoUrl: item?.entry_logo_url || item?.department_logo_url || null,
      };
    };
    const gold = identity(1);
    const silver = identity(2);
    const bronze = identity(3);
    const fourth = identity(4);
    return {
      sport: row?.sport_name || "Sport",
      category: row?.event_name || "",
      image_url: row?.sport_image_url || null,
      gold: gold.name,
      gold_department: gold.department,
      gold_logo_url: gold.logoUrl,
      silver: silver.name,
      silver_department: silver.department,
      silver_logo_url: silver.logoUrl,
      bronze: bronze.name,
      bronze_department: bronze.department,
      bronze_logo_url: bronze.logoUrl,
      fourth: fourth.name,
      fourth_department: fourth.department,
      fourth_logo_url: fourth.logoUrl,
    };
  })
);

export const mapChampionshipLeaderboard = (rows = []) => (
  (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row?.department_id,
    name: row?.department_name,
    code: row?.department_code,
    logoUrl: row?.logo_url,
    rank: row?.rank,
    gold: row?.gold,
    silver: row?.silver,
    bronze: row?.bronze,
    fourth: row?.fourth,
    participation: row?.participation,
    totalPoints: row?.total_points,
    status: row?.status,
  }))
);
