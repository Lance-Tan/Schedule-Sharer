import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface ScheduleSummary {
  scheduleId: number;
  name: string;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private baseUrl = `${environment.apiUrl}/schedules`;

  constructor(private http: HttpClient) { }

  listSchedules(userId: number) {
    return this.http.get<ScheduleSummary[]>(`${this.baseUrl}/list`, {
      params: new HttpParams().set('userId', String(userId))
    });
  }

  createSchedule(userId: number, name: string) {
    return this.http.post<{ scheduleId: number; name: string; message: string }>(
      `${this.baseUrl}/create`,
      { userId, name }
    );
  }

  setActiveSchedule(userId: number, scheduleId: number) {
    return this.http.post<{ message: string }>(`${this.baseUrl}/set-active`, { userId, scheduleId });
  }

  deleteSchedule(scheduleId: number, userId: number) {
    return this.http.delete(`${this.baseUrl}/${scheduleId}`, {
      params: new HttpParams().set('userId', String(userId))
    });
  }

  renameSchedule(scheduleId: number, userId: number, name: string) {
    return this.http.patch<{ message: string; name: string }>(`${this.baseUrl}/${scheduleId}`, {
      userId,
      name
    });
  }

  uploadSchedule(userId: number, file: File, scheduleId?: number | null) {
    const formData = new FormData();
    formData.append('userId', userId.toString());
    formData.append('file', file);
    if (scheduleId != null) {
      formData.append('scheduleId', String(scheduleId));
    }
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  getSchedule(
    targetUserId: number,
    opts?: { viewerId?: number; scheduleId?: number | null }
  ) {
    let params = new HttpParams();
    if (opts?.viewerId != null) {
      params = params.set('viewerId', String(opts.viewerId));
    }
    if (opts?.scheduleId != null) {
      params = params.set('scheduleId', String(opts.scheduleId));
    }
    return this.http.get(`${this.baseUrl}/${targetUserId}`, { params });
  }
}
