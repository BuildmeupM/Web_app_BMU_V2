try:
    import mysql.connector
    print("mysql.connector OK")
except ImportError as e:
    print(f"mysql.connector FAIL: {e}")

try:
    from mcp.server.fastmcp import FastMCP
    print("mcp.server.fastmcp OK")
except ImportError as e:
    print(f"mcp FAIL: {e}")

try:
    conn = mysql.connector.connect(
        host="buildmeupconsultant.direct.quickconnect.to",
        port=3306,
        user="buildmeM",
        password="Buildmeup23.04.2022",
        database="bmu_work_management",
        connection_timeout=5,
    )
    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    print(f"MySQL connection OK: {cursor.fetchone()}")
    conn.close()
except Exception as e:
    print(f"MySQL connection FAIL: {e}")
