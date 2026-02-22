import mysql.connector
from mcp.server.fastmcp import FastMCP

# สร้าง MCP Server สำหรับ Bot_server_js
mcp = FastMCP("Bot-Server-JS-MySQL")

# ตั้งค่าการเชื่อมต่อ MySQL สำหรับ Bot_server_js
DB_CONFIG = {
    "host": "buildmeupconsultant.direct.quickconnect.to",
    "port": 3306,
    "user": "buildmeM",
    "password": "Buildmeup23.04.2022",
    "database": "Bot_server_js"
}


@mcp.tool()
def list_tables():
    """ดูรายชื่อตารางทั้งหมดใน Bot_server_js"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor()
    cursor.execute("SHOW TABLES")
    tables = [t[0] for t in cursor.fetchall()]
    conn.close()
    return tables


@mcp.tool()
def describe_table(table_name: str):
    """ดูโครงสร้างของตาราง (Schema) ใน Bot_server_js"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    cursor.execute(f"DESCRIBE `{table_name}`")
    schema = cursor.fetchall()
    conn.close()
    return schema


@mcp.tool()
def execute_query(sql: str):
    """รันคำสั่ง SQL (เน้น SELECT ตามกฎ Safety First)"""
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(sql)
        if sql.strip().upper().startswith("SELECT"):
            result = cursor.fetchall()
        else:
            conn.commit()
            result = f"สำเร็จ: Affected rows {cursor.rowcount}"
    except Exception as e:
        result = f"เกิดข้อผิดพลาด: {str(e)}"
    finally:
        conn.close()
    return result


if __name__ == "__main__":
    mcp.run()
