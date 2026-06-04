$path = "src/app/(dashboard)/career/CareerManagementClient.jsx"
# 生テキストを読み込み
$content = Get-Content $path -Raw

# 日本語文字列を Unicode エスケープで生成 (文字化け防止)
$nextText = "$([char]0x6b21)$([char]0x3078)" # 次へ
$savingText = "$([char]0x4fdd)$([char]0x5b58)$([char]0x4e2d)..." # 保存中...
$saveText = "$([char]0x5909)$([char]0x66f4)$([char]0x3092)$([char]0x4fdd)$([char]0x5b58)$([char]0x3059)$([char]0x308b)" # 変更を保存する

# 置き換えるボタンのパターン (正規表現、改行や末尾スペースを許容)
$oldText = '(?s)\s*<button\s+key=\{surveyStep < 5 \? ''survey-next-btn'' : ''survey-save-btn''\}.*?<\/button>'

$newText = @"

                                        {surveyStep < 5 ? (
                                            <button 
                                                key="survey-next-btn"
                                                type="button" 
                                                onClick={() => setSurveyStep(prev => prev + 1)}
                                                className={styles.nextBtn}
                                                disabled={savingSurvey}
                                            >
                                                $nextText
                                            </button>
                                        ) : (
                                            <button 
                                                key="survey-save-btn"
                                                type="submit" 
                                                className={styles.submitBtn}
                                                disabled={savingSurvey}
                                            >
                                                <Save size={16} />
                                                {savingSurvey ? '$savingText' : '$saveText'}
                                            </button>
                                        )}
"@

# 置換の実行
$replaced = $content -replace $oldText, $newText

if ($content -eq $replaced) {
    Write-Output "ERROR: Pattern did not match."
} else {
    # 保存 (エンコーディング指定なしのWriteAllTextはBOMなしUTF-8)
    [System.IO.File]::WriteAllText((Convert-Path $path), $replaced)
    Write-Output "Successfully replaced button code."
}
