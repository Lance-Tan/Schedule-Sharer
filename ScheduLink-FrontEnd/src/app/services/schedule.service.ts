import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScheduleService {
  private baseUrl = `${environment.apiUrl}/schedules`;

  constructor(private http: HttpClient) { }

  uploadSchedule(userId: number, file: File) {
    const formData = new FormData();
    formData.append('userId', userId.toString());
    formData.append('file', file);
    return this.http.post(`${this.baseUrl}/upload`, formData);
  }

  getSchedule(userId: number) {
    return this.http.get(`${this.baseUrl}/${userId}`);
  }
}
