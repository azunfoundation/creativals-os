<?php
declare(strict_types=1);
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class AttendanceRecord extends Model {
    use SoftDeletes;
    protected $fillable = ['user_id','date','check_in_at','check_out_at','break_minutes','status','notes','location','ip_address'];
    protected function casts(): array {
        return ['date'=>'date','check_in_at'=>'datetime','check_out_at'=>'datetime','break_minutes'=>'integer'];
    }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    
    /** Compute worked minutes (excluding breaks) */
    public function getWorkedMinutesAttribute(): int {
        if (!$this->check_in_at || !$this->check_out_at) return 0;
        $total = $this->check_in_at->diffInMinutes($this->check_out_at);
        return max(0, $total - $this->break_minutes);
    }
}
