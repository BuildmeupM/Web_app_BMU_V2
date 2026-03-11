import platform
import subprocess
import json

def get_powershell_output(command):
    try:
        result = subprocess.run(
            ["powershell", "-NoProfile", "-NonInteractive", "-Command", command], 
            capture_output=True, text=True, creationflags=subprocess.CREATE_NO_WINDOW,
            stdin=subprocess.DEVNULL, timeout=10
        )
        lines = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]
        return ", ".join(lines) if lines else ""
    except Exception as e:
        return f"Error: {e}"

def fetch_all_data():
    data = {}
    
    # CPU
    cpu_wmi = "Get-CimInstance Win32_Processor"
    c = get_powershell_output(f"({cpu_wmi}).NumberOfCores").strip()
    t = get_powershell_output(f"({cpu_wmi}).NumberOfLogicalProcessors").strip()
    data["cpu"] = {
        "name": get_powershell_output(f"({cpu_wmi}).Name"),
        "manufacturer": get_powershell_output(f"({cpu_wmi}).Manufacturer"),
        "threads": f"{c} Cores / {t} Threads" if c and t else "",
        "socket": get_powershell_output(f"({cpu_wmi}).SocketDesignation"),
        "base_clock": get_powershell_output(f"({cpu_wmi}).MaxClockSpeed") + " MHz",
        "l2_cache": get_powershell_output(f"({cpu_wmi}).L2CacheSize") + " KB",
        "l3_cache": get_powershell_output(f"({cpu_wmi}).L3CacheSize") + " KB"
    }

    # Mainboard
    mb_wmi = "Get-CimInstance Win32_BaseBoard"
    bios_wmi = "Get-CimInstance Win32_BIOS"
    data["mainboard"] = {
        "manufacturer": get_powershell_output(f"({mb_wmi}).Manufacturer"),
        "model": get_powershell_output(f"({mb_wmi}).Product"),
        "version": get_powershell_output(f"({mb_wmi}).Version"),
        "bios_vendor": get_powershell_output(f"({bios_wmi}).Manufacturer"),
        "bios_version": get_powershell_output(f"({bios_wmi}).SMBIOSBIOSVersion"),
        "bios_date": get_powershell_output(f"({bios_wmi}).ReleaseDate.ToString('MM/dd/yyyy')")
    }

    # Memory
    mem_sys = "Get-CimInstance Win32_ComputerSystem"
    try:
        total_ram = float(get_powershell_output(f"({mem_sys}).TotalPhysicalMemory").replace(',',''))
        ram_size = f"{round(total_ram / (1024**3), 2)} GB"
    except:
        ram_size = ""

    mem_phy = "Get-CimInstance Win32_PhysicalMemory | Select-Object -First 1"
    try:
        ff_val = get_powershell_output(f"({mem_phy}).FormFactor")
        form_factors = {"8": "DIMM", "12": "SO-DIMM"}
        form_factor = form_factors.get(str(ff_val).strip(), "Unknown")
    except:
        form_factor = "Unknown"

    data["memory"] = {
        "size": ram_size,
        "speed": get_powershell_output(f"({mem_phy}).Speed") + " MHz",
        "manufacturer": get_powershell_output(f"({mem_phy}).Manufacturer"),
        "part_number": get_powershell_output(f"({mem_phy}).PartNumber"),
        "form_factor": form_factor
    }

    # Graphics
    gpu_wmi = "Get-CimInstance Win32_VideoController | Select-Object -First 1"
    try:
        vram = float(get_powershell_output(f"({gpu_wmi}).AdapterRAM").replace(',',''))
        vram_size = f"{int(vram / (1024**2))} MB"
    except:
        vram_size = ""
        
    data["graphics"] = {
        "name": get_powershell_output(f"({gpu_wmi}).Name"),
        "manufacturer": get_powershell_output(f"({gpu_wmi}).AdapterCompatibility"),
        "driver": get_powershell_output(f"({gpu_wmi}).DriverVersion"),
        "vram": vram_size,
        "resolution": "Unknown" # resolution cannot reliably be retrieved scriptedly easily like gui via tk context, unless invoking WmiMonitorBasicDisplayParams or similarly
    }

    # About
    data["about"] = {
        "os": f"{platform.system()} {platform.release()} ({platform.version()})",
        "computer_name": platform.node()
    }
    
    # Devices
    mon_info = get_powershell_output("Get-CimInstance Win32_PnPEntity | Where-Object { $_.Service -eq 'monitor' } | Select-Object -ExpandProperty Name")
    if not mon_info or mon_info == "ไม่พบข้อมูล":
        mon_info = get_powershell_output("Get-CimInstance Win32_DesktopMonitor | Select-Object -ExpandProperty Name")
        
    mouse_name = get_powershell_output("Get-CimInstance Win32_PnPEntity | Where-Object { $_.Service -eq 'mouclass' } | Select-Object -ExpandProperty Name | Select-Object -First 1")
    mouse_info = mouse_name if mouse_name and mouse_name != "ไม่พบข้อมูล" else get_powershell_output("Get-CimInstance Win32_PointingDevice | Select-Object -ExpandProperty Name | Select-Object -First 1")
    
    kbd_name = get_powershell_output("Get-CimInstance Win32_PnPEntity | Where-Object { $_.Service -eq 'kbdclass' } | Select-Object -ExpandProperty Name | Select-Object -First 1")
    kbd_info = kbd_name if kbd_name and kbd_name != "ไม่พบข้อมูล" else get_powershell_output("Get-CimInstance Win32_Keyboard | Select-Object -ExpandProperty Name | Select-Object -First 1")
    
    disk_info = get_powershell_output("Get-CimInstance Win32_LogicalDisk | Where-Object DriveType -eq 3 | ForEach-Object { $_.DeviceID + ' ' + [math]::Round($_.Size / 1GB, 2).ToString() + ' GB' }")
    if not disk_info or disk_info == "ไม่พบข้อมูล" or "Error" in disk_info:
        disk_info = get_powershell_output("Get-CimInstance Win32_DiskDrive | Select-Object -ExpandProperty Model")
    disk_info = disk_info.replace('\n', ', ')

    usb_info = get_powershell_output("Get-CimInstance Win32_PnPEntity | Where-Object { $_.DeviceID -match '^USB' -and $_.Name -notmatch 'Hub|Root|Composite|โฮสต์' } | Select-Object -ExpandProperty Name | Select-Object -First 2")
    usb_info = usb_info.replace('\n', ', ') if usb_info and usb_info != "ไม่พบข้อมูล" else "No specific USB found"

    data["devices"] = {
        "monitor": mon_info,
        "mouse": mouse_info,
        "keyboard": kbd_info,
        "disk": disk_info,
        "usb": usb_info
    }

    return data

if __name__ == "__main__":
    import sys
    try:
        data = fetch_all_data()
        print(json.dumps(data, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
